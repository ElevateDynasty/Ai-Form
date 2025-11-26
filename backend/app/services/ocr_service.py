import io
import os
import re
from pathlib import Path
from typing import Dict, Any, List

from PIL import Image
import pdfplumber
import pytesseract

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def _ensure_tesseract_path():
    custom_path = os.getenv("TESSERACT_CMD")
    if custom_path:
        pytesseract.pytesseract.tesseract_cmd = custom_path


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        texts = [page.extract_text() or "" for page in pdf.pages]
    combined = "\n".join(texts)
    return combined.strip()


def _extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return pytesseract.image_to_string(image)


EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{3}[\s-]\d{3}[\s-]\d{4})")
DOB_RE = re.compile(
    r"(?:DOB|Date of Birth|D\.O\.B)[:\s]*((?:\d{2}[/-]){2}\d{2,4}|\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)
BLANK_LINE_RE = re.compile(r"^[_\.\-\s]{3,}$")


def _parse_fields(text: str) -> Dict[str, Any]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    fields: Dict[str, Any] = {}

    # Name heuristic: first line with letters only and > 3 chars
    for line in lines[:5]:
        if re.match(r"^[A-Za-z ,.'-]{3,}$", line) and "name" not in line.lower():
            fields.setdefault("full_name", line.title())
            break

    email_match = EMAIL_RE.search(text)
    if email_match:
        fields["email"] = email_match.group(0)

    phone_match = PHONE_RE.search(text)
    if phone_match:
        fields["phone"] = phone_match.group(0)

    dob_match = DOB_RE.search(text)
    if dob_match:
        fields["date_of_birth"] = dob_match.group(1)

    # Address heuristic: look for line containing keywords
    for idx, line in enumerate(lines):
        if any(keyword in line.lower() for keyword in ["address", "residence", "residential"]):
            addr_lines = lines[idx : idx + 3]
            address = " ".join(addr_lines)
            fields["address"] = address.replace("Address", "").strip()
            break

    return fields


def extract_fields_from_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    _ensure_tesseract_path()

    suffix = Path(filename or "").suffix.lower()
    try:
        if suffix == ".pdf":
            text = _extract_text_from_pdf(file_bytes)
        elif suffix in IMAGE_EXTENSIONS:
            text = _extract_text_from_image(file_bytes)
        else:
            # fallback: try both
            text = _extract_text_from_image(file_bytes)
    except Exception as exc:
        raise RuntimeError(f"OCR failed: {exc}")

    text = text.strip()
    fields = _parse_fields(text)

    return {
        "filename": filename,
        "raw_text": text,
        "fields": fields,
    }


def _slugify_label(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return slug or "field"


def _guess_field_type(label: str) -> str:
    lower = label.lower()
    if "email" in lower:
        return "email"
    if any(token in lower for token in ["phone", "mobile", "contact"]):
        return "tel"
    if any(token in lower for token in ["date", "dob", "birth"]):
        return "date"
    if any(token in lower for token in ["amount", "total", "number", "qty"]):
        return "number"
    if any(token in lower for token in ["address", "reason", "description", "notes"]):
        return "textarea"
    return "text"


INLINE_FILL_RE = re.compile(r"(?P<label>.{3,}?)(?:[:*]|\b)\s*(?:_{3,}|\.{3,}|[-]{4,})\s*(?:optional|required)?$", re.IGNORECASE)


def _line_to_label(line: str, next_line: str | None = None) -> str | None:
    inline_match = INLINE_FILL_RE.match(line.strip())
    if inline_match:
        return inline_match.group("label").strip()

    normalized = re.sub(r"[_\.]{3,}", " ", line).strip()
    if not normalized:
        return None
    if ":" in normalized:
        before_colon, after_colon = normalized.split(":", 1)
        if after_colon.strip():
            return before_colon.strip()
        if next_line and BLANK_LINE_RE.match(next_line):
            return before_colon.strip()
    if normalized.endswith("?"):
        return normalized.rstrip("?").strip()
    if re.search(r"\b(optional|required)\b", normalized.lower()) and ":" in normalized:
        return normalized.split(":", 1)[0].strip()
    if re.search(r"\b(?:name|address|city|state|zip|phone|email|reason|amount)\b", normalized, re.IGNORECASE):
        words = normalized.split()
        if len(words) <= 6:
            return normalized
    if next_line and BLANK_LINE_RE.match(next_line):
        stripped = normalized.rstrip("*:")
        if 3 <= len(stripped) <= 60:
            return stripped.strip()
    return None


def _generate_fields_from_text(text: str, max_fields: int = 60) -> List[Dict[str, Any]]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    candidates: List[Dict[str, Any]] = []
    used_names = set()

    idx = 0
    while idx < len(lines) and len(candidates) < max_fields:
        line = lines[idx]
        next_line = lines[idx + 1] if idx + 1 < len(lines) else None
        label = _line_to_label(line, next_line)
        if not label:
            idx += 1
            continue
        if len(label) < 3 or len(label) > 60:
            idx += 1
            continue
        name_base = _slugify_label(label)
        name = name_base
        suffix = 2
        while name in used_names:
            name = f"{name_base}_{suffix}"
            suffix += 1
        used_names.add(name)
        field_type = _guess_field_type(label)
        source_text = line.lower()
        if next_line:
            source_text += f" {next_line.lower()}"
        required = "required" in source_text
        candidates.append(
            {
                "name": name,
                "label": label,
                "type": field_type,
                "required": required,
                "fullWidth": len(label) > 24,
            }
        )
        if next_line and BLANK_LINE_RE.match(next_line):
            idx += 2
        else:
            idx += 1

    if not candidates:
        parsed = _parse_fields(text)
        for key, value in parsed.items():
            label = key.replace("_", " ").title()
            candidates.append(
                {
                    "name": key,
                    "label": label,
                    "type": _guess_field_type(label),
                    "required": False,
                    "fullWidth": len(label) > 24,
                    "default": value,
                }
            )

    return candidates[:max_fields]


def generate_schema_from_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    _ensure_tesseract_path()

    suffix = Path(filename or "").suffix.lower()
    try:
        if suffix == ".pdf":
            text = _extract_text_from_pdf(file_bytes)
        elif suffix in IMAGE_EXTENSIONS:
            text = _extract_text_from_image(file_bytes)
        else:
            text = _extract_text_from_image(file_bytes)
    except Exception as exc:
        raise RuntimeError(f"Document analysis failed: {exc}")

    text = text.strip()
    fields = _generate_fields_from_text(text)
    schema = {
        "fields": fields,
        "meta": {
            "source_filename": filename,
            "generated": True,
        },
    }
    return schema
