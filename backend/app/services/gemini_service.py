"""
Gemini AI Service for smart form generation and document understanding.
Uses REST API directly for reliability on resource-constrained servers.
"""
import json
import logging
import os
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyB-Q8a5uf_cnpF9FsI9II57HBVxgVLPG9k")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def _call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini API directly via REST."""
    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048,
                }
            },
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"Gemini API error {response.status_code}: {response.text}")
            return None
            
        data = response.json()
        # Extract text from response
        candidates = data.get("candidates", [])
        if candidates and candidates[0].get("content", {}).get("parts"):
            return candidates[0]["content"]["parts"][0].get("text", "")
        return None
        
    except requests.Timeout:
        logger.error("Gemini API timeout")
        return None
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return None


def generate_form_schema(prompt: str) -> Dict[str, Any]:
    """
    Generate a complete form schema from a natural language prompt using Gemini AI.
    
    Args:
        prompt: Natural language description of the form (e.g., "Create a job application form")
    
    Returns:
        Form schema with fields array
    """
    system_prompt = """You are a form schema generator. Given a description, create a JSON form schema.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.

The schema must follow this exact structure:
{
  "fields": [
    {
      "name": "field_name_snake_case",
      "label": "Human Readable Label",
      "type": "text|email|tel|number|date|textarea|select",
      "required": true|false,
      "fullWidth": true|false,
      "placeholder": "Helper text...",
      "options": ["Option 1", "Option 2"] // only for select type
    }
  ]
}

Field type guidelines:
- "text": Names, addresses, general text
- "email": Email addresses
- "tel": Phone numbers
- "number": Age, quantity, amounts
- "date": Dates (DOB, joining date, etc.)
- "textarea": Long text (descriptions, comments, address)
- "select": Multiple choice (gender, country, department)

Generate comprehensive fields based on the description. Include all relevant fields.
Make name fields fullWidth: true. Make textarea fields fullWidth: true.
Add appropriate placeholders for each field."""

    try:
        response_text = _call_gemini(f"{system_prompt}\n\nUser request: {prompt}")
        
        if not response_text:
            logger.warning("Gemini API returned empty; using fallback")
            return _fallback_form_generation(prompt)
        
        response_text = response_text.strip()
        
        # Clean up response - remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        # Parse JSON
        schema = json.loads(response_text)
        
        # Validate and normalize
        if "fields" not in schema:
            schema = {"fields": schema if isinstance(schema, list) else []}
        
        # Ensure each field has required properties
        for field in schema.get("fields", []):
            field.setdefault("name", field.get("label", "field").lower().replace(" ", "_"))
            field.setdefault("label", field.get("name", "Field"))
            field.setdefault("type", "text")
            field.setdefault("required", False)
            field.setdefault("fullWidth", field.get("type") == "textarea")
        
        return schema
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return _fallback_form_generation(prompt)
    except Exception as e:
        logger.error(f"Gemini form generation error: {e}")
        return _fallback_form_generation(prompt)


def enhance_ocr_text(ocr_text: str) -> Dict[str, Any]:
    """
    Use Gemini to clean OCR output and extract structured field-value pairs.
    
    Args:
        ocr_text: Raw text extracted from OCR
    
    Returns:
        Dictionary with cleaned text and extracted fields
    """
    
    prompt = f"""Analyze this OCR-extracted text and:
1. Fix any OCR errors, typos, or formatting issues
2. Extract all field-value pairs you can identify

Respond with JSON only:
{{
  "cleaned": "The corrected/cleaned text",
  "fields": {{
    "field_name": "extracted_value",
    "another_field": "another_value"
  }}
}}

Common fields to look for: name, email, phone, address, date, id numbers, etc.

OCR Text:
{ocr_text}"""

    try:
        response_text = _call_gemini(prompt)
        if not response_text:
            return {"cleaned": ocr_text, "fields": {}}
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Gemini OCR enhancement error: {e}")
        return {"cleaned": ocr_text, "fields": {}}


def analyze_document(document_text: str, form_fields: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Analyze a document and extract values for form fields.
    
    Args:
        document_text: Text content of the document
        form_fields: Optional list of field names to look for
    
    Returns:
        Dictionary mapping field names to extracted values
    """
    
    fields_hint = ""
    if form_fields:
        fields_hint = f"\n\nSpecifically look for these fields: {', '.join(form_fields)}"
    
    prompt = f"""Analyze this document and extract all identifiable information as field-value pairs.

Respond with JSON only - a flat object mapping field names to values:
{{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890"
}}

Use snake_case for field names. Extract ALL relevant information.{fields_hint}

Document:
{document_text}"""

    try:
        response_text = _call_gemini(prompt)
        if not response_text:
            return {}
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Gemini document analysis error: {e}")
        return {}


def translate_text_gemini(text: str, target_lang: str = "hi") -> str:
    """
    Translate text using Gemini for better quality translations.
    
    Args:
        text: Text to translate
        target_lang: Target language code ('hi' for Hindi)
    
    Returns:
        Translated text
    """
    lang_names = {
        "hi": "Hindi",
        "en": "English"
    }
    target_name = lang_names.get(target_lang, target_lang)
    
    prompt = f"""Translate the following text to {target_name}. 
Respond with ONLY the translated text, nothing else.

Text: {text}"""

    try:
        response_text = _call_gemini(prompt)
        return response_text.strip() if response_text else text
    except Exception as e:
        logger.error(f"Gemini translation error: {e}")
        return text


def _fallback_form_generation(prompt: str) -> Dict[str, Any]:
    """Fallback form generation using keyword matching when Gemini is unavailable."""
    import re
    
    prompt_lower = prompt.lower()
    fields = []
    
    patterns = [
        (r"\b(full\s*)?name\b", "full_name", "Full Name", "text", True),
        (r"\bemail\b", "email", "Email Address", "email", True),
        (r"\bphone|mobile|contact\b", "phone", "Phone Number", "tel", False),
        (r"\baddress\b", "address", "Address", "textarea", False),
        (r"\bdate|dob|birth\b", "date", "Date", "date", False),
        (r"\bage\b", "age", "Age", "number", False),
        (r"\bgender|sex\b", "gender", "Gender", "select", False),
        (r"\bcomments?|feedback|message\b", "comments", "Comments", "textarea", False),
    ]
    
    found = set()
    for pattern, name, label, field_type, required in patterns:
        if re.search(pattern, prompt_lower) and name not in found:
            found.add(name)
            field = {
                "name": name,
                "label": label,
                "type": field_type,
                "required": required,
                "fullWidth": field_type == "textarea" or name == "full_name"
            }
            if field_type == "select" and name == "gender":
                field["options"] = ["Male", "Female", "Other"]
            fields.append(field)
    
    if not fields:
        fields = [
            {"name": "full_name", "label": "Full Name", "type": "text", "required": True, "fullWidth": True},
            {"name": "email", "label": "Email", "type": "email", "required": True, "fullWidth": False},
        ]
    
    return {"fields": fields}
