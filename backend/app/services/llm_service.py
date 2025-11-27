from typing import Dict, Any, List
import re

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

def generate_form_from_prompt(prompt: str) -> Dict[str, Any]:
    """
    Generates a form schema from a natural language prompt using heuristic keyword matching.
    """
    prompt_lower = prompt.lower()
    fields = []
    
    # Common field patterns
    patterns = [
        (r"\b(full\s*)?name\b", "full_name", "Full Name", "text"),
        (r"\bemail\b", "email", "Email Address", "email"),
        (r"\bphone|mobile|contact\b", "phone", "Phone Number", "tel"),
        (r"\baddress\b", "address", "Address", "textarea"),
        (r"\bdate|dob|birth\b", "date", "Date", "date"),
        (r"\bage\b", "age", "Age", "number"),
        (r"\bgender|sex\b", "gender", "Gender", "select", ["Male", "Female", "Other"]),
        (r"\bcomments?|feedback|message\b", "comments", "Comments", "textarea"),
        (r"\bcity\b", "city", "City", "text"),
        (r"\bstate\b", "state", "State", "text"),
        (r"\bzip|postal\b", "zip_code", "Zip Code", "text"),
        (r"\bcountry\b", "country", "Country", "text"),
        (r"\bcompany|organization\b", "company", "Company", "text"),
        (r"\bjob|title|position\b", "job_title", "Job Title", "text"),
        (r"\bdepartment\b", "department", "Department", "text"),
    ]

    # Check for specific keywords in the prompt
    found_fields = set()
    
    for pattern, name, label, type_, *options in patterns:
        if re.search(pattern, prompt_lower):
            # Avoid duplicates
            base_name = name
            counter = 1
            while name in found_fields:
                name = f"{base_name}_{counter}"
                counter += 1
            
            found_fields.add(name)
            
            field = {
                "name": name,
                "label": label,
                "type": type_,
                "required": False, # Default to false unless specified
                "fullWidth": type_ == "textarea"
            }
            
            if options:
                field["options"] = options[0]
                
            fields.append(field)

    # If no fields found, add a generic one
    if not fields:
        fields.append({
            "name": "description",
            "label": "Description",
            "type": "textarea",
            "required": True,
            "fullWidth": True
        })

    return {
        "fields": fields,
        "meta": {
            "generated_from": prompt
        }
    }
