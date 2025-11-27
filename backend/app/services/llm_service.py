from typing import Dict, Any, List
import re
import os
import json

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


def generate_form_from_prompt_openai(prompt: str) -> Dict[str, Any]:
    """
    Generates a form schema from a natural language prompt using OpenAI GPT.
    Falls back to heuristic matching if OpenAI is unavailable.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        # Fall back to heuristic method
        return generate_form_from_prompt_heuristic(prompt)
    
    try:
        import openai
        
        client = openai.OpenAI(api_key=api_key)
        
        system_prompt = """You are a form schema generator. Given a user's description, create a JSON form schema.
        
Return ONLY valid JSON with this exact structure:
{
  "fields": [
    {
      "name": "field_name_snake_case",
      "label": "Human Readable Label",
      "type": "text|email|tel|number|date|textarea|select",
      "required": true|false,
      "fullWidth": true|false,
      "placeholder": "optional placeholder text",
      "options": ["only for select type"]
    }
  ]
}

Field type options:
- "text": Short text input
- "email": Email address
- "tel": Phone number
- "number": Numeric input
- "date": Date picker
- "textarea": Long text (set fullWidth: true)
- "select": Dropdown (include options array)

Guidelines:
- Use snake_case for field names
- Make primary fields required
- Use fullWidth: true for textarea and address fields
- Include appropriate placeholders
- Generate 3-10 relevant fields based on the form purpose"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a form schema for: {prompt}"}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        schema = json.loads(result_text)
        
        # Validate the schema has fields
        if "fields" not in schema or not isinstance(schema["fields"], list):
            raise ValueError("Invalid schema structure")
        
        # Add metadata
        schema["meta"] = {
            "generated_from": prompt,
            "generator": "openai"
        }
        
        return schema
        
    except ImportError:
        # openai package not installed, fall back to heuristic
        return generate_form_from_prompt_heuristic(prompt)
    except Exception as e:
        # Any other error, fall back to heuristic
        print(f"OpenAI generation failed: {e}, falling back to heuristic")
        return generate_form_from_prompt_heuristic(prompt)


def generate_form_from_prompt_heuristic(prompt: str) -> Dict[str, Any]:
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
            "generated_from": prompt,
            "generator": "heuristic"
        }
    }


# Main function that tries OpenAI first, then falls back to heuristic
def generate_form_from_prompt(prompt: str) -> Dict[str, Any]:
    """
    Generates a form schema from a natural language prompt.
    Uses OpenAI GPT if available, otherwise falls back to heuristic matching.
    """
    return generate_form_from_prompt_openai(prompt)
