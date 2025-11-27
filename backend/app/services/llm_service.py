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


def match_ocr_fields_with_ai(ocr_fields: Dict[str, Any], form_fields: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Uses Hugging Face AI to intelligently match OCR extracted fields to form fields.
    Returns a mapping of form_field_name -> extracted_value
    """
    hf_token = os.getenv("HF_TOKEN")
    
    if not hf_token or not ocr_fields or not form_fields:
        return {}
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=hf_token,
        )
        
        # Prepare form field info
        form_field_info = []
        for f in form_fields:
            form_field_info.append({
                "name": f.get("name"),
                "label": f.get("label", f.get("name")),
                "type": f.get("type", "text")
            })
        
        system_prompt = """You are an intelligent OCR field matcher for Indian government forms and documents.

Your task: Match extracted OCR data to the correct form fields.

IMPORTANT CONTEXT for Indian documents:
- "name" could match "applicant_name", "full_name", "candidate_name", etc.
- "father" or "father's name" matches "father_name", "father_husband_name", etc.
- "aadhaar", "aadhar", "uid" all refer to Aadhaar number
- "dob" means date of birth
- "mob", "mobile", "phone", "contact" are all phone numbers
- "addr", "address", "residence" are addresses
- "pin", "pincode", "postal code" are PIN codes
- Consider Hindi transliterations and abbreviations

Return ONLY a valid JSON object mapping form field names to extracted values.
Format: {"form_field_name": "extracted_value", ...}

Only include fields where you find a confident match. Skip uncertain matches.
Do NOT include any explanation, markdown, or extra text - ONLY the JSON object."""

        user_message = f"""OCR Extracted Data:
{json.dumps(ocr_fields, indent=2)}

Form Fields to Fill:
{json.dumps(form_field_info, indent=2)}

Match the extracted data to the form fields. Return JSON mapping."""

        completion = client.chat.completions.create(
            model="moonshotai/Kimi-K2-Thinking:novita",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=1000,
            temperature=0.3  # Lower temperature for more consistent matching
        )
        
        result_text = completion.choices[0].message.content.strip()
        
        # Extract JSON from response
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        # Find JSON object
        start_idx = result_text.find("{")
        end_idx = result_text.rfind("}") + 1
        if start_idx != -1 and end_idx > start_idx:
            result_text = result_text[start_idx:end_idx]
        
        matched = json.loads(result_text)
        
        # Validate that matched keys are actual form field names
        valid_field_names = {f.get("name") for f in form_fields}
        validated = {}
        for key, value in matched.items():
            if key in valid_field_names and value:
                validated[key] = str(value)
        
        return validated
        
    except Exception as e:
        print(f"AI field matching failed: {e}")
        return {}
