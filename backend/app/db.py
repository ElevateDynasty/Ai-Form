import os
import json
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend_data.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Pre-defined form templates for common documents
SEED_TEMPLATES = [
    {
        "title": "Aadhaar Card Application",
        "description": "Application form for new Aadhaar card enrollment or update",
        "schema": {
            "fields": [
                {"name": "full_name", "label": "Full Name (as per documents)", "type": "text", "required": True, "placeholder": "Enter your full name"},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True, "placeholder": "10-digit mobile number"},
                {"name": "email", "label": "Email Address", "type": "email", "required": False, "placeholder": "your.email@example.com"},
                {"name": "address_line1", "label": "Address Line 1", "type": "text", "required": True, "placeholder": "House/Flat No., Building Name"},
                {"name": "address_line2", "label": "Address Line 2", "type": "text", "required": False, "placeholder": "Street, Locality"},
                {"name": "city", "label": "City/Town/Village", "type": "text", "required": True},
                {"name": "district", "label": "District", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "select", "required": True, "options": ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"]},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True, "placeholder": "6-digit PIN code"},
                {"name": "father_name", "label": "Father's Name", "type": "text", "required": False},
                {"name": "mother_name", "label": "Mother's Name", "type": "text", "required": False},
            ]
        }
    },
    {
        "title": "PAN Card Application (Form 49A)",
        "description": "Application for allotment of Permanent Account Number (PAN) for Indian citizens",
        "schema": {
            "fields": [
                {"name": "surname", "label": "Surname / Last Name", "type": "text", "required": True},
                {"name": "first_name", "label": "First Name", "type": "text", "required": True},
                {"name": "middle_name", "label": "Middle Name", "type": "text", "required": False},
                {"name": "father_surname", "label": "Father's Surname", "type": "text", "required": True},
                {"name": "father_first_name", "label": "Father's First Name", "type": "text", "required": True},
                {"name": "father_middle_name", "label": "Father's Middle Name", "type": "text", "required": False},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Transgender"]},
                {"name": "status", "label": "Status", "type": "select", "required": True, "options": ["Individual", "Hindu Undivided Family", "Company", "Firm", "Association of Persons", "Trust", "Government"]},
                {"name": "aadhaar_number", "label": "Aadhaar Number (if available)", "type": "text", "required": False, "placeholder": "12-digit Aadhaar number"},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "email", "label": "Email Address", "type": "email", "required": True},
                {"name": "address", "label": "Residence Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "city", "label": "City/Town", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "text", "required": True},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "source_of_income", "label": "Source of Income", "type": "select", "required": True, "options": ["Salary", "Business/Profession", "Capital Gains", "House Property", "Other Sources", "No Income"]},
            ]
        }
    },
    {
        "title": "Passport Application",
        "description": "Application form for new passport or passport renewal",
        "schema": {
            "fields": [
                {"name": "application_type", "label": "Application Type", "type": "select", "required": True, "options": ["Fresh Passport", "Re-issue of Passport", "Passport for Minor"]},
                {"name": "booklet_type", "label": "Booklet Type", "type": "select", "required": True, "options": ["36 Pages", "60 Pages"]},
                {"name": "given_name", "label": "Given Name", "type": "text", "required": True},
                {"name": "surname", "label": "Surname", "type": "text", "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "place_of_birth", "label": "Place of Birth", "type": "text", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "marital_status", "label": "Marital Status", "type": "select", "required": True, "options": ["Single", "Married", "Divorced", "Widow/Widower", "Separated"]},
                {"name": "education", "label": "Educational Qualification", "type": "select", "required": True, "options": ["Below Matriculation", "Matriculation", "Graduate", "Post Graduate", "Professional Degree", "Others"]},
                {"name": "employment_type", "label": "Employment Type", "type": "select", "required": True, "options": ["Government", "PSU", "Statutory Body", "Private", "Self-Employed", "Student", "Retired", "Housewife", "Unemployed"]},
                {"name": "father_name", "label": "Father's Full Name", "type": "text", "required": True},
                {"name": "mother_name", "label": "Mother's Full Name", "type": "text", "required": True},
                {"name": "spouse_name", "label": "Spouse's Name (if married)", "type": "text", "required": False},
                {"name": "present_address", "label": "Present Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "email", "label": "Email Address", "type": "email", "required": True},
                {"name": "emergency_contact_name", "label": "Emergency Contact Name", "type": "text", "required": True},
                {"name": "emergency_contact_phone", "label": "Emergency Contact Phone", "type": "tel", "required": True},
            ]
        }
    },
    {
        "title": "Voter ID (EPIC) Application",
        "description": "Application for new Voter ID card / Electoral Photo Identity Card",
        "schema": {
            "fields": [
                {"name": "full_name", "label": "Full Name", "type": "text", "required": True},
                {"name": "surname", "label": "Surname", "type": "text", "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "age", "label": "Age (as on 1st January)", "type": "number", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "relation_type", "label": "Relation Type", "type": "select", "required": True, "options": ["Father", "Mother", "Husband"]},
                {"name": "relative_name", "label": "Father's/Mother's/Husband's Name", "type": "text", "required": True},
                {"name": "present_address", "label": "Present Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "district", "label": "District", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "text", "required": True},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "email", "label": "Email Address", "type": "email", "required": False},
                {"name": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": False},
            ]
        }
    },
    {
        "title": "Driving License Application",
        "description": "Application for new driving license or renewal",
        "schema": {
            "fields": [
                {"name": "application_type", "label": "Application Type", "type": "select", "required": True, "options": ["Learner License", "Permanent License", "Renewal", "Duplicate", "International Driving Permit"]},
                {"name": "vehicle_class", "label": "Vehicle Class", "type": "select", "required": True, "options": ["LMV (Light Motor Vehicle)", "MCWG (Motorcycle with Gear)", "MCWOG (Motorcycle without Gear)", "HMV (Heavy Motor Vehicle)", "Transport Vehicle"]},
                {"name": "full_name", "label": "Full Name", "type": "text", "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "blood_group", "label": "Blood Group", "type": "select", "required": True, "options": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]},
                {"name": "father_husband_name", "label": "Father's/Husband's Name", "type": "text", "required": True},
                {"name": "qualification", "label": "Educational Qualification", "type": "select", "required": True, "options": ["Illiterate", "Below 10th", "10th Pass", "12th Pass", "Graduate", "Post Graduate"]},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "email", "label": "Email Address", "type": "email", "required": False},
                {"name": "present_address", "label": "Present Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": False},
                {"name": "identification_mark1", "label": "Identification Mark 1", "type": "text", "required": True},
                {"name": "identification_mark2", "label": "Identification Mark 2", "type": "text", "required": False},
            ]
        }
    },
    {
        "title": "Bank Account Opening Form",
        "description": "Application for opening a new savings/current bank account",
        "schema": {
            "fields": [
                {"name": "account_type", "label": "Account Type", "type": "select", "required": True, "options": ["Savings Account", "Current Account", "Salary Account", "Fixed Deposit", "Recurring Deposit"]},
                {"name": "title", "label": "Title", "type": "select", "required": True, "options": ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."]},
                {"name": "first_name", "label": "First Name", "type": "text", "required": True},
                {"name": "middle_name", "label": "Middle Name", "type": "text", "required": False},
                {"name": "last_name", "label": "Last Name", "type": "text", "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "marital_status", "label": "Marital Status", "type": "select", "required": True, "options": ["Single", "Married", "Divorced", "Widowed"]},
                {"name": "father_spouse_name", "label": "Father's/Spouse's Name", "type": "text", "required": True},
                {"name": "mother_name", "label": "Mother's Maiden Name", "type": "text", "required": True},
                {"name": "nationality", "label": "Nationality", "type": "text", "required": True, "default": "Indian"},
                {"name": "pan_number", "label": "PAN Number", "type": "text", "required": True, "placeholder": "ABCDE1234F"},
                {"name": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "email", "label": "Email Address", "type": "email", "required": True},
                {"name": "occupation", "label": "Occupation", "type": "select", "required": True, "options": ["Salaried", "Self-Employed", "Business", "Professional", "Student", "Retired", "Housewife", "Others"]},
                {"name": "annual_income", "label": "Annual Income Range", "type": "select", "required": True, "options": ["Below 2.5 Lakhs", "2.5 - 5 Lakhs", "5 - 10 Lakhs", "10 - 25 Lakhs", "Above 25 Lakhs"]},
                {"name": "correspondence_address", "label": "Correspondence Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "city", "label": "City", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "text", "required": True},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "nominee_name", "label": "Nominee Name", "type": "text", "required": True},
                {"name": "nominee_relation", "label": "Relation with Nominee", "type": "select", "required": True, "options": ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Other"]},
                {"name": "initial_deposit", "label": "Initial Deposit Amount", "type": "number", "required": True},
            ]
        }
    },
    {
        "title": "Income Certificate Application",
        "description": "Application for income certificate from tehsil/district office",
        "schema": {
            "fields": [
                {"name": "applicant_name", "label": "Applicant's Full Name", "type": "text", "required": True},
                {"name": "father_name", "label": "Father's Name", "type": "text", "required": True},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "occupation", "label": "Occupation", "type": "text", "required": True},
                {"name": "annual_income", "label": "Annual Income (in Rs.)", "type": "number", "required": True},
                {"name": "income_source", "label": "Source of Income", "type": "textarea", "required": True, "rows": 2, "placeholder": "e.g., Agriculture, Business, Employment"},
                {"name": "ration_card_number", "label": "Ration Card Number", "type": "text", "required": False},
                {"name": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True},
                {"name": "address", "label": "Residential Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "village_town", "label": "Village/Town", "type": "text", "required": True},
                {"name": "tehsil", "label": "Tehsil/Taluka", "type": "text", "required": True},
                {"name": "district", "label": "District", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "text", "required": True},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "purpose", "label": "Purpose of Certificate", "type": "select", "required": True, "options": ["Education/Scholarship", "Government Job", "Loan Application", "Subsidy/Scheme", "Legal Purpose", "Other"]},
            ]
        }
    },
    {
        "title": "Domicile/Residence Certificate",
        "description": "Application for domicile or residence certificate",
        "schema": {
            "fields": [
                {"name": "applicant_name", "label": "Applicant's Full Name", "type": "text", "required": True},
                {"name": "father_name", "label": "Father's Name", "type": "text", "required": True},
                {"name": "mother_name", "label": "Mother's Name", "type": "text", "required": False},
                {"name": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True},
                {"name": "place_of_birth", "label": "Place of Birth", "type": "text", "required": True},
                {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"]},
                {"name": "nationality", "label": "Nationality", "type": "text", "required": True, "default": "Indian"},
                {"name": "religion", "label": "Religion", "type": "text", "required": False},
                {"name": "caste", "label": "Caste", "type": "text", "required": False},
                {"name": "residence_since", "label": "Residing in State Since (Year)", "type": "number", "required": True},
                {"name": "current_address", "label": "Current Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": True, "rows": 3},
                {"name": "village_town", "label": "Village/Town", "type": "text", "required": True},
                {"name": "district", "label": "District", "type": "text", "required": True},
                {"name": "state", "label": "State", "type": "text", "required": True},
                {"name": "pincode", "label": "PIN Code", "type": "text", "required": True},
                {"name": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True},
                {"name": "mobile_number", "label": "Mobile Number", "type": "tel", "required": True},
                {"name": "purpose", "label": "Purpose of Certificate", "type": "select", "required": True, "options": ["Education", "Employment", "Property", "Marriage", "Other"]},
            ]
        }
    },
]


def init_db(base):
    base.metadata.create_all(bind=engine)
    # Seed default templates
    seed_default_templates()


def seed_default_templates():
    """Seed the database with pre-defined form templates if they don't exist."""
    from .models import FormTemplate
    
    session = SessionLocal()
    try:
        # Check if templates already exist
        existing_count = session.query(FormTemplate).count()
        if existing_count == 0:
            for template_data in SEED_TEMPLATES:
                template = FormTemplate(
                    title=template_data["title"],
                    description=template_data["description"],
                    schema=json.dumps(template_data["schema"]),
                    created_by="system"
                )
                session.add(template)
            session.commit()
            print(f"✅ Seeded {len(SEED_TEMPLATES)} default form templates")
        else:
            print(f"ℹ️ Database already has {existing_count} templates, skipping seed")
    except Exception as e:
        session.rollback()
        print(f"⚠️ Error seeding templates: {e}")
    finally:
        session.close()


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
