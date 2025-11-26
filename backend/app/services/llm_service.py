from typing import Dict, Any

def clean_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned and not cleaned[0].isupper():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned

def merge_form_sources(form_schema: Dict[str, Any], sources: Dict[str, Any]) -> Dict[str, Any]:
    priority = ["voice", "ocr", "profile"]
    result = {}

    fields = form_schema.get("fields", [])
    for field in fields:
        name = field.get("name")
        if not name:
            continue
        value = None
        for src in priority:
            src_dict = sources.get(src, {})
            if name in src_dict and src_dict[name]:
                value = src_dict[name]
                break
        result[name] = value

    return result
