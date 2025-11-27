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
            "generated_from": prompt,
            "generator": "heuristic"
        }
    }


def generate_form_with_ai(prompt: str) -> Dict[str, Any]:
    """
    Generates a form schema using Hugging Face Router API with Kimi-K2 model.
    Falls back to heuristic if AI fails.
    """
    hf_token = os.getenv("HF_TOKEN")
    
    if not hf_token:
        print("HF_TOKEN not found, using heuristic")
        return generate_form_from_prompt(prompt)
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=hf_token,
        )
        
        system_prompt = """You are a form schema generator. Given a user's description, create a JSON form schema.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
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

Field types: text, email, tel, number, date, textarea, select
Use snake_case for names. Generate 3-8 relevant fields."""

        completion = client.chat.completions.create(
            model="moonshotai/Kimi-K2-Thinking:novita",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a form for: {prompt}"}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        result_text = completion.choices[0].message.content.strip()
        
        # Extract JSON from response
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        # Find JSON object in response
        start_idx = result_text.find("{")
        end_idx = result_text.rfind("}") + 1
        if start_idx != -1 and end_idx > start_idx:
            result_text = result_text[start_idx:end_idx]
        
        schema = json.loads(result_text)
        
        if "fields" not in schema or not isinstance(schema["fields"], list):
            raise ValueError("Invalid schema structure")
        
        schema["meta"] = {
            "generated_from": prompt,
            "generator": "ai"
        }
        
        return schema
        
    except ImportError:
        print("openai package not installed, using heuristic")
        return generate_form_from_prompt(prompt)
    except Exception as e:
        print(f"AI generation failed: {e}, using heuristic")
        return generate_form_from_prompt(prompt)
