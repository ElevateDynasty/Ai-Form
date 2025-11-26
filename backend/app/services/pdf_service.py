import json
import io
from datetime import datetime
from typing import Dict, Any

from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

def fill_pdf_form(pdf_bytes: bytes, json_bytes: bytes) -> bytes:
    """
    Fill AcroForm fields in a PDF using provided JSON field values.
    If the PDF has no form fields, returns original PDF.
    """
    field_values: Dict[str, str] = json.loads(json_bytes.decode("utf-8"))

    input_stream = io.BytesIO(pdf_bytes)
    reader = PdfReader(input_stream)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    if "/AcroForm" in reader.trailer["/Root"]:
        writer._root_object.update(
            {"/AcroForm": reader.trailer["/Root"]["/AcroForm"]}
        )
        # Very basic: update first page form fields
        writer.update_page_form_field_values(writer.pages[0], field_values)

    output_stream = io.BytesIO()
    writer.write(output_stream)
    return output_stream.getvalue()


def render_response_pdf(form_title: str | None, schema: Dict[str, Any] | None, data: Dict[str, Any]) -> bytes:
    """Render a simple PDF summary for a form response."""

    normalized_data: Dict[str, Any]
    if isinstance(data, dict):
        normalized_data = data
    else:
        try:
            normalized_data = json.loads(data)
        except (TypeError, json.JSONDecodeError):
            normalized_data = {}

    normalized_schema: Dict[str, Any]
    if isinstance(schema, dict):
        normalized_schema = schema
    else:
        try:
            normalized_schema = json.loads(schema) if schema else {}
        except (TypeError, json.JSONDecodeError):
            normalized_schema = {}

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=LETTER)
    width, height = LETTER

    margin_x = 50
    y = height - 60

    title = form_title or "Form Response"
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin_x, y, title)
    y -= 24

    c.setFont("Helvetica", 10)
    c.drawString(margin_x, y, f"Generated: {datetime.utcnow().isoformat()}Z")
    y -= 28

    fields = normalized_schema.get("fields") if isinstance(normalized_schema, dict) else []
    if not isinstance(fields, list) or not fields:
        fields = [{"name": key, "label": key} for key in normalized_data.keys()]

    for field in fields:
        if not isinstance(field, dict):
            continue
        label = field.get("label") or field.get("name") or "Field"
        name = field.get("name")
        value = normalized_data.get(name, "") if isinstance(normalized_data, dict) else ""
        rendered_value = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)

        if y < 100:
            c.showPage()
            y = height - 60
            c.setFont("Helvetica", 10)

        c.setFont("Helvetica-Bold", 11)
        c.drawString(margin_x, y, label)
        y -= 16
        c.setFont("Helvetica", 10)
        c.drawString(margin_x, y, str(rendered_value))
        y -= 22

    c.save()
    buffer.seek(0)
    return buffer.read()
