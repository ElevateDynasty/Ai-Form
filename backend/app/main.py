import io
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any
from uuid import uuid4
from sqlalchemy.orm import Session

# Simple in-memory users/sessions for demo purposes only
_USERS = {
    "admin": {"password": "adminpass", "role": "admin"},
    "user": {"password": "userpass", "role": "user"},
}
_SESSIONS: Dict[str, Dict[str, str]] = {}

# If these imports fail, make sure the files exist:
# backend/app/services/ocr_service.py, stt_service.py, llm_service.py, pdf_service.py
from .db import get_db, init_db, seed_default_templates, SEED_TEMPLATES
from .models import Base, FormTemplate, FormResponse
from .services.ocr_service import extract_fields_from_document, generate_schema_from_document, get_tesseract_info
from .services.llm_service import clean_text, generate_form_from_prompt
from .services.pdf_service import fill_pdf_form, render_response_pdf
from .services.tts_service import synthesize_speech
from .services.bart_service import clean_transcription, summarize_text, extract_key_phrases, translate_text


app = FastAPI(title="AI Universal Form Assistant")

# Allow frontend (React/Streamlit) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


class SpeechRequest(BaseModel):
    text: str
    lang: str | None = "en"


class FormTemplatePayload(BaseModel):
    title: str = Field(..., min_length=1)
    description: str | None = None
    template_schema: Dict[str, Any]


class FormResponsePayload(BaseModel):
    data: Dict[str, Any]


class TextCleanRequest(BaseModel):
    text: str


class TextSummaryRequest(BaseModel):
    text: str
    max_length: int = 50


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "hi"


class FormGenerationRequest(BaseModel):
    prompt: str


@app.on_event("startup")
def on_startup():
    init_db(Base)


@app.get("/")
async def root():
    """Root endpoint - redirects to API docs or shows welcome message."""
    return {
        "message": "AI Universal Form Assistant API",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/tesseract/status")
async def tesseract_status():
    """Check Tesseract OCR installation status and available languages."""
    info = get_tesseract_info()
    return info


@app.get("/api/seed")
async def public_seed_templates(db: Session = Depends(get_db)):
    """Public endpoint to seed default templates (for initial setup)."""
    existing_count = db.query(FormTemplate).count()
    
    if existing_count > 0:
        return {
            "message": "Templates already exist",
            "count": existing_count
        }
    
    added = 0
    for template_data in SEED_TEMPLATES:
        template = FormTemplate(
            title=template_data["title"],
            description=template_data["description"],
            schema=json.dumps(template_data["schema"]),
            created_by="system"
        )
        db.add(template)
        added += 1
    
    db.commit()
    return {
        "message": f"Seeded {added} templates successfully!",
        "added": added
    }


@app.post("/api/admin/seed-templates")
async def seed_templates(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Manually seed pre-defined form templates (admin only)."""
    _require_admin(authorization)
    
    existing_count = db.query(FormTemplate).count()
    added = 0
    
    for template_data in SEED_TEMPLATES:
        # Check if template with same title already exists
        exists = db.query(FormTemplate).filter(
            FormTemplate.title == template_data["title"]
        ).first()
        
        if not exists:
            template = FormTemplate(
                title=template_data["title"],
                description=template_data["description"],
                schema=json.dumps(template_data["schema"]),
                created_by="system"
            )
            db.add(template)
            added += 1
    
    db.commit()
    return {
        "message": f"Seeded {added} new templates",
        "existing": existing_count,
        "added": added,
        "total": existing_count + added
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """
    Basic demo login. Returns a simple access token and role.
    Use demo credentials: `admin`/`adminpass` or `user`/`userpass`.
    """
    user = _USERS.get(req.username)
    if not user or user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = str(uuid4())
    _SESSIONS[token] = {"username": req.username, "role": user.get("role")}
    return {"access_token": token, "role": user.get("role")}


@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    role = req.role.lower().strip()
    if role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")
    if req.username in _USERS:
        raise HTTPException(status_code=400, detail="Username already exists")

    _USERS[req.username] = {"password": req.password, "role": role}
    token = str(uuid4())
    _SESSIONS[token] = {"username": req.username, "role": role}
    return {"access_token": token, "role": role}


def _get_session_from_auth(auth_header: str | None):
    if not auth_header:
        return None
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    return _SESSIONS.get(token)


def _require_session(authorization: str | None):
    sess = _get_session_from_auth(authorization)
    if not sess:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sess


def _require_admin(authorization: str | None):
    sess = _require_session(authorization)
    if sess.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return sess


@app.get("/api/auth/me")
async def me(authorization: str | None = Header(default=None)):
    sess = _get_session_from_auth(authorization)
    if not sess:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"username": sess.get("username"), "role": sess.get("role")}


@app.post("/api/auth/logout")
async def logout(authorization: str | None = Header(default=None)):
    sess = _get_session_from_auth(authorization)
    if not sess:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # remove session
    token = authorization.split(" ", 1)[1].strip()
    _SESSIONS.pop(token, None)
    return {"ok": True}


@app.post("/api/ocr/extract")
async def ocr_extract(file: UploadFile = File(...)):
    """
    Upload a document (PDF/image) and return structured fields.
    Currently uses a stub (dummy) OCR implementation.
    """
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Invalid file")

    content = await file.read()
    try:
        data = extract_fields_from_document(content, filename=file.filename)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return data


@app.post("/api/forms/ingest")
async def ingest_form_template(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    _require_admin(authorization)
    content = await file.read()
    try:
        schema = generate_schema_from_document(content, file.filename)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    fields = schema.get("fields") or []
    if not fields:
        raise HTTPException(status_code=422, detail="Unable to detect fields in the document")

    return {"schema": schema, "filename": file.filename}


@app.post("/api/forms/generate")
async def generate_form(
    req: FormGenerationRequest,
    authorization: str | None = Header(default=None),
):
    _require_admin(authorization)
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        schema = generate_form_from_prompt(req.prompt)
        return {"schema": schema, "prompt": req.prompt}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/voice/transcribe")
async def voice_transcribe(file: UploadFile = File(...), lang: str | None = None):
    """Server STT removed; clients must rely on browser-based recognition."""

    raise HTTPException(
        status_code=410,
        detail="Server transcription endpoint has been retired. Please use the browser speech recognition control.",
    )


@app.post("/api/voice/speak")
async def voice_speak(req: SpeechRequest):
    try:
        audio_bytes = synthesize_speech(req.text, req.lang or "en")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )


@app.get("/api/forms")
async def list_forms(db: Session = Depends(get_db)):
    rows = (
        db.query(FormTemplate)
        .order_by(FormTemplate.updated_at.desc(), FormTemplate.created_at.desc())
        .all()
    )
    return {"items": [row.to_dict() for row in rows]}


@app.post("/api/forms")
async def create_form(
    req: FormTemplatePayload,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    sess = _require_admin(authorization)
    template = FormTemplate(
        title=req.title.strip(),
        description=req.description,
        schema=json.dumps(req.template_schema),
        created_by=sess.get("username"),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template.to_dict()


@app.get("/api/forms/{form_id}")
async def get_form(form_id: int, db: Session = Depends(get_db)):
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")
    return template.to_dict()


@app.put("/api/forms/{form_id}")
async def update_form(
    form_id: int,
    req: FormTemplatePayload,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(authorization)
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")

    template.title = req.title.strip()
    template.description = req.description
    template.schema = json.dumps(req.template_schema)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template.to_dict()


@app.delete("/api/forms/{form_id}")
async def delete_form(
    form_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(authorization)
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")
    db.delete(template)
    db.commit()
    return {"ok": True}


@app.post("/api/forms/{form_id}/responses")
async def submit_form_response(
    form_id: int,
    req: FormResponsePayload,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    sess = _require_session(authorization)
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")
    response = FormResponse(
        form_id=form_id,
        username=sess.get("username"),
        data=json.dumps(req.data),
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return {"form_id": form_id, "response_id": response.id}


@app.get("/api/forms/{form_id}/responses/{response_id}/download")
async def download_form_response(
    form_id: int,
    response_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    sess = _require_session(authorization)
    response = (
        db.query(FormResponse)
        .filter(FormResponse.id == response_id, FormResponse.form_id == form_id)
        .first()
    )
    if not response:
        raise HTTPException(status_code=404, detail="Form response not found")
    if response.username != sess.get("username") and sess.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to download this response")

    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    payload = {
        "form": template.to_dict() if template else {"id": form_id},
        "response": response.to_dict(),
    }
    data_bytes = json.dumps(payload, indent=2).encode("utf-8")
    filename = f"form-{form_id}-response-{response_id}.json"
    return StreamingResponse(
        io.BytesIO(data_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/forms/{form_id}/responses/{response_id}/pdf")
async def download_form_response_pdf(
    form_id: int,
    response_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    sess = _require_session(authorization)
    response = (
        db.query(FormResponse)
        .filter(FormResponse.id == response_id, FormResponse.form_id == form_id)
        .first()
    )
    if not response:
        raise HTTPException(status_code=404, detail="Form response not found")
    if response.username != sess.get("username") and sess.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to download this response")

    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    template_dict = template.to_dict() if template else {"id": form_id, "title": f"Form {form_id}", "schema": {}}
    template_schema = template_dict.get("schema")
    form_title = template_dict.get("title")
    response_payload = response.to_dict().get("data") or {}

    pdf_bytes = render_response_pdf(form_title, template_schema, response_payload)
    filename = f"form-{form_id}-response-{response_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/api/pdf/fill")
async def pdf_fill(file: UploadFile = File(...), field_values: UploadFile = File(...)):
    """
    Fill a PDF form using provided JSON of field values.
    Returns a new PDF bytes.
    """
    pdf_bytes = await file.read()
    json_bytes = await field_values.read()

    filled_pdf_bytes = fill_pdf_form(pdf_bytes, json_bytes)

    return StreamingResponse(
        io.BytesIO(filled_pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=filled_form.pdf"},
    )


@app.post("/api/llm/clean")
async def llm_clean(req: TextCleanRequest):
    """Clean and correct OCR/voice transcription using tinyBART."""
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    try:
        cleaned = clean_transcription(req.text)
        return {"original": req.text, "cleaned": cleaned}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(exc)}") from exc


@app.post("/api/llm/summarize")
async def llm_summarize(req: TextSummaryRequest):
    """Summarize long text using tinyBART."""
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    try:
        summary = summarize_text(req.text, req.max_length)
        return {"original": req.text, "summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(exc)}") from exc


@app.get("/api/llm/phrases")
async def llm_extract_phrases(text: str = None, num_phrases: int = 5):
    """Extract key phrases from text using tinyBART."""
    if not text:
        raise HTTPException(status_code=400, detail="Text query parameter required")
    try:
        phrases = extract_key_phrases(text, num_phrases)
        return {"text": text, "phrases": phrases}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(exc)}") from exc


@app.post("/api/llm/translate")
async def llm_translate(req: TranslateRequest):
    """Translate text (En -> Hi)."""
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    try:
        translated = translate_text(req.text, req.target_lang)
        return {"original": req.text, "translated": translated, "lang": req.target_lang}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(exc)}") from exc


# ==================== EXPORT ALL RESPONSES (CSV) ====================

@app.get("/api/forms/{form_id}/responses/export")
async def export_all_responses(
    form_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Export all responses for a form as CSV."""
    _require_admin(authorization)
    
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")
    
    responses = db.query(FormResponse).filter(FormResponse.form_id == form_id).all()
    
    if not responses:
        raise HTTPException(status_code=404, detail="No responses found for this form")
    
    # Get all unique field names from schema
    schema = template.to_dict().get("schema", {})
    fields = schema.get("fields", [])
    field_names = [f.get("name", "") for f in fields if f.get("name")]
    
    # Build CSV
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    header = ["Response ID", "Username", "Submitted At"] + field_names
    writer.writerow(header)
    
    # Data rows
    for resp in responses:
        resp_dict = resp.to_dict()
        data = resp_dict.get("data", {})
        row = [
            resp_dict.get("id", ""),
            resp_dict.get("username", ""),
            resp_dict.get("created_at", ""),
        ]
        for fname in field_names:
            row.append(data.get(fname, ""))
        writer.writerow(row)
    
    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"form-{form_id}-responses.csv"
    
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/forms/{form_id}/responses")
async def list_form_responses(
    form_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """List all responses for a form (admin only)."""
    _require_admin(authorization)
    
    template = db.query(FormTemplate).filter(FormTemplate.id == form_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form not found")
    
    responses = db.query(FormResponse).filter(FormResponse.form_id == form_id).all()
    return {"form_id": form_id, "count": len(responses), "responses": [r.to_dict() for r in responses]}
