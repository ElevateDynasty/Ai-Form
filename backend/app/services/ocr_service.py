import io
import os
import re
import sys
import logging
import base64
import httpx
from pathlib import Path
from typing import Dict, Any, List

from PIL import Image
import pdfplumber

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OCR.space API configuration
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "")
OCR_SPACE_URL = "https://api.ocr.space/parse/image"

# Make pytesseract optional (for local development)
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.info("pytesseract not installed; using OCR.space API")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def _ensure_tesseract_path():
    """Configure Tesseract path for local installation."""
    if not TESSERACT_AVAILABLE:
        return
        
    # Check if already configured via environment variable
    custom_path = os.getenv("TESSERACT_CMD")
    if custom_path and os.path.exists(custom_path):
        pytesseract.pytesseract.tesseract_cmd = custom_path
        return
    
    # Windows default installation paths
    if sys.platform == "win32":
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
        ]
        for path in common_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                return
    
    # Linux/Mac - tesseract should be in PATH
    # Check common Linux paths
    linux_paths = ["/usr/bin/tesseract", "/usr/local/bin/tesseract"]
    for path in linux_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            return


def _check_tesseract_available() -> bool:
    """Check if Tesseract is properly installed and accessible."""
    if not TESSERACT_AVAILABLE:
        return False
    _ensure_tesseract_path()
    try:
        version = pytesseract.get_tesseract_version()
        return version is not None
    except Exception:
        return False


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF - tries pdfplumber first, falls back to OCR for scanned PDFs."""
    # First try pdfplumber (for text-based PDFs)
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        texts = [page.extract_text() or "" for page in pdf.pages]
    combined = "\n".join(texts).strip()
    
    # If we got meaningful text, return it
    if len(combined) > 50:  # Arbitrary threshold for "meaningful" text
        return combined
    
    # Otherwise, it might be a scanned PDF - try OCR.space (supports PDF directly)
    if OCR_SPACE_API_KEY:
        logger.info("PDF appears to be scanned, trying OCR.space...")
        try:
            return _extract_text_with_ocr_space(file_bytes, lang="eng", is_pdf=True)
        except Exception as e:
            logger.warning(f"OCR.space failed for PDF: {e}")
    
    # Return whatever pdfplumber found (might be empty for scanned PDFs)
    return combined


def _extract_text_with_ocr_space(file_bytes: bytes, lang: str = "eng", is_pdf: bool = False) -> str:
    """Extract text using OCR.space API (cloud-based).
    
    Args:
        file_bytes: Image or PDF file content
        lang: Language code (eng, hin)
        is_pdf: Whether the file is a PDF
    """
    if not OCR_SPACE_API_KEY:
        raise RuntimeError("OCR_SPACE_API_KEY environment variable not set. Get a free key at https://ocr.space/ocrapi/freekey")
    
    # Convert to base64
    base64_data = base64.b64encode(file_bytes).decode('utf-8')
    
    # Map language codes
    lang_map = {"eng": "eng", "hin": "hin", "eng+hin": "eng"}
    ocr_lang = lang_map.get(lang, "eng")
    
    # Set correct MIME type
    mime_type = "application/pdf" if is_pdf else "image/png"
    
    payload = {
        "apikey": OCR_SPACE_API_KEY,
        "base64Image": f"data:{mime_type};base64,{base64_data}",
        "language": ocr_lang,
        "isOverlayRequired": False,
        "detectOrientation": True,
        "scale": True,
        "OCREngine": 2,  # Better for printed text
        "filetype": "PDF" if is_pdf else "PNG",
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(OCR_SPACE_URL, data=payload)
            result = response.json()
        
        if result.get("IsErroredOnProcessing"):
            error_msg = result.get("ErrorMessage", ["Unknown error"])
            raise RuntimeError(f"OCR.space error: {error_msg}")
        
        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return ""
        
        text = parsed_results[0].get("ParsedText", "")
        return text.strip()
        
    except httpx.RequestError as e:
        raise RuntimeError(f"OCR.space API request failed: {e}")


def _extract_text_with_tesseract(file_bytes: bytes, lang: str = "eng") -> str:
    """Extract text from image using local Tesseract OCR.
    
    Args:
        file_bytes: Image file content
        lang: Tesseract language code (eng, hin, eng+hin)
    """
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("Tesseract not available locally")
    
    _ensure_tesseract_path()
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    
    # OCR configuration for better accuracy
    custom_config = r'--oem 3 --psm 6'
    
    try:
        text = pytesseract.image_to_string(image, lang=lang, config=custom_config)
    except pytesseract.TesseractError as e:
        # Fallback to English only if language pack not available
        if "language" in str(e).lower():
            text = pytesseract.image_to_string(image, lang="eng", config=custom_config)
        else:
            raise
    except Exception as e:
        raise RuntimeError(f"Tesseract OCR failed: {e}")
    
    return text


def _extract_text_from_image(file_bytes: bytes, lang: str = "eng") -> str:
    """Extract text from image - tries local Tesseract first, falls back to OCR.space.
    
    Args:
        file_bytes: Image file content
        lang: Language code (eng, hin, eng+hin)
    """
    # Try local Tesseract first (faster, no API limits)
    if TESSERACT_AVAILABLE and _check_tesseract_available():
        try:
            logger.info("Using local Tesseract OCR")
            return _extract_text_with_tesseract(file_bytes, lang)
        except Exception as e:
            logger.warning(f"Tesseract failed, trying OCR.space: {e}")
    
    # Fall back to OCR.space API
    if OCR_SPACE_API_KEY:
        logger.info("Using OCR.space API")
        return _extract_text_with_ocr_space(file_bytes, lang, is_pdf=False)
    
    raise RuntimeError(
        "No OCR method available. Either install Tesseract locally or set OCR_SPACE_API_KEY environment variable. "
        "Get a free API key at https://ocr.space/ocrapi/freekey"
    )


def get_tesseract_info() -> Dict[str, Any]:
    """Get OCR availability info for debugging."""
    info = {
        "tesseract_available": False,
        "ocr_space_available": bool(OCR_SPACE_API_KEY),
        "version": None,
        "path": None,
        "languages": [],
        "recommended": "ocr_space" if OCR_SPACE_API_KEY else "tesseract",
    }
    
    if TESSERACT_AVAILABLE:
        _ensure_tesseract_path()
        try:
            info["version"] = str(pytesseract.get_tesseract_version())
            info["tesseract_available"] = True
            info["path"] = pytesseract.pytesseract.tesseract_cmd
            langs = pytesseract.get_languages()
            info["languages"] = langs if langs else ["eng"]
        except Exception as e:
            info["tesseract_error"] = str(e)
    
    return info


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
