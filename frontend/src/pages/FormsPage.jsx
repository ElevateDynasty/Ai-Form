import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";

function getFields(schema){
  if(schema && Array.isArray(schema.fields)) return schema.fields;
  return [];
}

const COMMAND_VERBS = ["add", "set", "fill", "update", "enter", "put", "change", "make"];
const VALUE_KEYWORD_PARTS = ["as", "is", "equals", "equal\\s+to", "to", "=", ":"];
const COMMAND_VERB_REGEX = COMMAND_VERBS.join("|");
const VALUE_KEYWORD_REGEX = VALUE_KEYWORD_PARTS.join("|");

const escapeRegex = (value)=> value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
const aliasToPattern = (alias)=> escapeRegex(alias.trim().toLowerCase()).replace(/\s+/g, "\\s+");
const cleanVoiceValue = (value)=> value.trim().replace(/^[,;:\s]+/, "").replace(/[\s.!?;,]+$/, "");

const isEmailField = (field)=>{
  if(!field) return false;
  const type = (field.type || "").toLowerCase();
  const name = (field.name || "").toLowerCase();
  const label = (field.label || "").toLowerCase();
  return type === "email" || name.includes("email") || label.includes("email");
};

const sanitizeFieldValue = (field, value = "")=>{
  if(!field) return value;
  if(isEmailField(field)){
    return value.replace(/\s+/g, "").toLowerCase();
  }
  return value;
};

function buildFieldMatchers(fields){
  return fields
    .map(field => {
      const aliasSource = [];
      if(field.label) aliasSource.push(field.label);
      if(field.name) aliasSource.push(field.name);
      if(Array.isArray(field.aliases)) aliasSource.push(...field.aliases);
      else if(typeof field.aliases === "string") aliasSource.push(field.aliases);
      const unique = Array.from(new Set(aliasSource.map(part => part?.toString().trim().toLowerCase()).filter(Boolean)));
      if(!unique.length) return null;
      const aliasPattern = unique.map(aliasToPattern).join("|");
      return {
        field,
        label: field.label || field.name,
        aliasPattern,
      };
    })
    .filter(Boolean);
}

export default function FormsPage(){
  const { token } = useAuth();
  const { language } = useLanguage();
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [responseId, setResponseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFieldName, setActiveFieldName] = useState(null);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [browserListening, setBrowserListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Browser STT idle");
  const recognitionRef = useRef(null);
  const [ttsText, setTtsText] = useState("");
  const [ttsStatus, setTtsStatus] = useState("Idle");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [ocrStatus, setOcrStatus] = useState("Upload a PDF or image to autofill fields");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  useEffect(()=>{ fetchForms(); }, []);

  useEffect(()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SpeechRecognition){ setBrowserSupported(true); }
    return ()=>{ recognitionRef.current?.stop(); };
  }, []);

  useEffect(()=>{
    if(selectedForm){
      setTtsText(`Please fill the ${selectedForm.title} form carefully.`);
      setVoiceStatus("Browser STT idle");
      setInterimTranscript("");
      setActiveFieldName(null);
      recognitionRef.current?.stop();
      setBrowserListening(false);
      if(audioUrl){
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }
    }
  }, [selectedForm]);

  useEffect(()=>{
    return ()=>{
      if(audioUrl){
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function fetchForms(){
    try{
      const res = await fetch(`${API_BASE}/forms`);
      if(!res.ok) throw new Error("Unable to load forms");
      const data = await res.json();
      setForms(data.items || []);
    }catch(err){
      setError(err.message);
    }
  }

  const activeFields = useMemo(()=> getFields(selectedForm?.schema), [selectedForm]);
  const fieldMatchers = useMemo(()=> buildFieldMatchers(activeFields), [activeFields]);

  // Filter forms based on search query
  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return forms;
    const query = searchQuery.toLowerCase();
    return forms.filter(form => 
      form.title?.toLowerCase().includes(query) ||
      form.description?.toLowerCase().includes(query)
    );
  }, [forms, searchQuery]);

  // Generate shareable link for the current form
  const getShareableLink = () => {
    if (!selectedForm) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/forms?id=${selectedForm.id}`;
  };

  const copyShareLink = async () => {
    const link = getShareableLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopyFeedback("Link copied!");
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch (err) {
      setCopyFeedback("Failed to copy");
    }
  };

  const selectForm = (template)=>{
    setSelectedForm(template);
    setStatus(""); setError(""); setResponseId(null);
    const initValues = {};
    getFields(template?.schema).forEach(field => {
      const defaultValue = field.default ?? "";
      initValues[field.name] = sanitizeFieldValue(field, defaultValue);
    });
    setValues(initValues);
  };

  const handleChange = (field, value)=>{
    setValues(prev => ({ ...prev, [field.name]: sanitizeFieldValue(field, value) }));
  };

  const handleFieldFocus = (name)=>{
    setActiveFieldName(name);
  };

  const tryAutoFillFromCommand = (spokenText)=>{
    if(!spokenText) return false;
    const segments = spokenText
      .split(/(?:\band\b|[.;])/i)
      .map(part => part.trim())
      .filter(Boolean);

    let updated = false;
    segmentsLoop: for(const phrase of segments){
      for(const matcher of fieldMatchers){
        if(!matcher.aliasPattern) continue;
        const aliasGroup = `(?:${matcher.aliasPattern})`;
        const patterns = [
          new RegExp(`\\b(?:${COMMAND_VERB_REGEX})\\b\\s+(?:the\\s+)?${aliasGroup}\\b\\s+(?:${VALUE_KEYWORD_REGEX})\\s+(.+)`, "i"),
          new RegExp(`\\b${aliasGroup}\\b\\s+(?:${VALUE_KEYWORD_REGEX})\\s+(.+)`, "i"),
          new RegExp(`\\b(?:${COMMAND_VERB_REGEX})\\b\\s+(?:the\\s+)?${aliasGroup}\\b\\s+(.+)`, "i"),
        ];

        for(const pattern of patterns){
          const match = phrase.match(pattern);
          const candidate = match && match[match.length - 1];
          const cleaned = candidate && cleanVoiceValue(candidate);
          if(cleaned){
            setValues(prev => ({ ...prev, [matcher.field.name]: sanitizeFieldValue(matcher.field, cleaned) }));
            setVoiceStatus(`Set ${matcher.label || matcher.field.name} via voice command`);
            setActiveFieldName(matcher.field.name);
            updated = true;
            continue segmentsLoop;
          }
        }
      }
    }

    return updated;
  };

  const stopBrowserStt = ()=>{
    recognitionRef.current?.stop();
  };

  const startBrowserStt = ()=>{
    setError("");
    if(!selectedForm){
      setError("Select a form before using voice input");
      return;
    }
    if(!browserSupported){
      setError("Browser speech recognition is not available");
      return;
    }
    if(browserListening){
      stopBrowserStt();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      setError("Browser speech recognition is not available");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    const activeField = activeFieldName ? activeFields.find(f => f.name === activeFieldName) : null;
    const fieldLabel = activeFieldName
      ? (activeField?.label || activeFieldName)
      : "voice commands";
    recognition.onstart = ()=>{
      setBrowserListening(true);
      setVoiceStatus(
        activeFieldName
          ? `Listening for ${fieldLabel}`
          : "Listening for commands like 'Add email as ...'"
      );
      setInterimTranscript("");
    };
    recognition.onerror = (event)=>{
      setError(event.error === "not-allowed" ? "Microphone blocked for this site" : "Browser STT error");
      stopBrowserStt();
    };
    recognition.onresult = (event)=>{
      let interim = "";
      let finalChunks = [];
      for(let i = event.resultIndex; i < event.results.length; i++){
        const transcript = event.results[i][0].transcript;
        if(event.results[i].isFinal){ finalChunks.push(transcript); }
        else { interim += transcript; }
      }
      if(finalChunks.length){
        const finalText = finalChunks.join(" ").trim();
        if(finalText){
          const handled = tryAutoFillFromCommand(finalText);
          if(!handled){
            if(activeFieldName && activeField){
              setValues(prev => {
                const prevVal = prev[activeFieldName] ?? "";
                const nextVal = `${prevVal ? prevVal + " " : ""}${finalText}`.trim();
                return { ...prev, [activeFieldName]: sanitizeFieldValue(activeField, nextVal) };
              });
              const label = activeField.label || activeFieldName;
              setVoiceStatus(`Captured voice input for ${label}`);
            }else{
              setVoiceStatus("No field matched. Try saying 'Set email as example@domain.com'.");
            }
          }
        }
      }
      setInterimTranscript(interim);
    };
    recognition.onend = ()=>{
      setBrowserListening(false);
      recognitionRef.current = null;
      setInterimTranscript("");
      setVoiceStatus("Browser STT idle");
    };
    recognition.start();
  };

  const speakText = async ()=>{
    if(!ttsText.trim()){
      setError("Enter some text to speak");
      return;
    }
    setError("");
    setTtsStatus("Generating speech...");
    setTtsLoading(true);
    try{
      const res = await fetch(`${API_BASE}/voice/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, lang: "en" }),
      });
      if(!res.ok){
        const msg = await res.json().catch(()=>({ detail: "Unable to synthesize" }));
        throw new Error(msg.detail || "Unable to synthesize");
      }
      const blob = await res.blob();
      if(audioUrl){ URL.revokeObjectURL(audioUrl); }
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTtsStatus("Ready to play");
    }catch(err){
      setError(err.message);
      setTtsStatus("Failed");
    }
    setTtsLoading(false);
  };

  const handleTranslate = async (fieldName) => {
    const text = values[fieldName];
    if (!text || !text.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/llm/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target_lang: "hi" }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      if (data.translated) {
        setValues(prev => ({ ...prev, [fieldName]: data.translated }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Smart field matching - maps common OCR field names to form field variations
  const FIELD_ALIASES = {
    // === NAME VARIATIONS ===
    name: ['name', 'full_name', 'fullname', 'applicant_name', 'applicants_name', 'applicant', 'your_name', 'user_name', 'username', 'candidate_name', 'student_name', 'employee_name', 'given_name', 'person_name'],
    full_name: ['full_name', 'fullname', 'name', 'applicant_name', 'applicants_name', 'complete_name', 'your_name', 'candidate_name', 'person_name'],
    first_name: ['first_name', 'firstname', 'fname', 'given_name', 'forename', 'christian_name'],
    last_name: ['last_name', 'lastname', 'lname', 'surname', 'family_name', 'family'],
    surname: ['surname', 'last_name', 'lastname', 'family_name', 'lname'],
    middle_name: ['middle_name', 'middlename', 'mname', 'second_name'],
    given_name: ['given_name', 'first_name', 'firstname', 'fname', 'forename'],
    applicant_name: ['applicant_name', 'applicants_name', 'name', 'full_name', 'candidate_name', 'your_name'],
    
    // === PARENT/GUARDIAN NAMES ===
    father_name: ['father_name', 'fathers_name', 'father', 'guardian_name', 'parent_name', 'dad_name', 'papa_name', 'father_full_name', 'father_husband_name'],
    father_first_name: ['father_first_name', 'fathers_first_name', 'father_fname'],
    father_surname: ['father_surname', 'fathers_surname', 'father_last_name', 'father_lname'],
    father_middle_name: ['father_middle_name', 'fathers_middle_name'],
    father_husband_name: ['father_husband_name', 'father_name', 'husband_name', 'guardian_name', 'father_or_husband'],
    mother_name: ['mother_name', 'mothers_name', 'mother', 'mom_name', 'maa_name', 'mother_full_name', 'mothers_maiden_name'],
    spouse_name: ['spouse_name', 'husband_name', 'wife_name', 'partner_name', 'spouse'],
    husband_name: ['husband_name', 'spouse_name', 'partner_name'],
    guardian_name: ['guardian_name', 'father_name', 'mother_name', 'parent_name', 'caretaker_name'],
    relative_name: ['relative_name', 'father_name', 'mother_name', 'husband_name', 'guardian_name', 'relation_name'],
    father_spouse_name: ['father_spouse_name', 'father_name', 'spouse_name', 'husband_name'],
    nominee_name: ['nominee_name', 'nominee', 'beneficiary_name', 'beneficiary'],
    nominee_relation: ['nominee_relation', 'relation_with_nominee', 'nominee_relationship'],
    emergency_contact_name: ['emergency_contact_name', 'emergency_name', 'emergency_person', 'emergency_contact'],
    emergency_contact_phone: ['emergency_contact_phone', 'emergency_phone', 'emergency_mobile', 'emergency_number'],
    
    // === EMAIL VARIATIONS ===
    email: ['email', 'email_address', 'emailaddress', 'e_mail', 'mail', 'applicant_email', 'your_email', 'contact_email', 'user_email', 'email_id', 'emailid'],
    
    // === PHONE/MOBILE VARIATIONS ===
    phone: ['phone', 'phone_number', 'phonenumber', 'contact', 'contact_number', 'telephone', 'tel', 'phone_no', 'landline'],
    mobile: ['mobile', 'mobile_number', 'mobilenumber', 'cell', 'cellphone', 'cell_number', 'mob', 'mobile_no'],
    mobile_number: ['mobile_number', 'mobile', 'phone', 'phone_number', 'contact_number', 'cell', 'cell_number', 'mob_no', 'mob_number'],
    contact_number: ['contact_number', 'phone', 'mobile', 'telephone', 'contact'],
    
    // === ADDRESS VARIATIONS ===
    address: ['address', 'full_address', 'street_address', 'residential_address', 'home_address', 'mailing_address', 'applicant_address', 'your_address', 'location', 'addr'],
    address_line1: ['address_line1', 'address_line_1', 'addressline1', 'address1', 'street_address', 'house_no', 'flat_no', 'building'],
    address_line2: ['address_line2', 'address_line_2', 'addressline2', 'address2', 'locality', 'area', 'street'],
    present_address: ['present_address', 'current_address', 'temporary_address', 'correspondence_address', 'mailing_address'],
    permanent_address: ['permanent_address', 'home_address', 'native_address', 'residential_address'],
    current_address: ['current_address', 'present_address', 'temporary_address', 'correspondence_address'],
    correspondence_address: ['correspondence_address', 'mailing_address', 'present_address', 'current_address', 'postal_address'],
    residential_address: ['residential_address', 'home_address', 'permanent_address', 'residence_address'],
    city: ['city', 'town', 'locality', 'place', 'city_name', 'municipal'],
    village: ['village', 'town', 'city', 'gram', 'gaon'],
    village_town: ['village_town', 'village', 'town', 'city', 'place'],
    district: ['district', 'dist', 'zila', 'county'],
    tehsil: ['tehsil', 'taluka', 'taluk', 'sub_district', 'mandal', 'block'],
    state: ['state', 'province', 'region', 'pradesh'],
    country: ['country', 'nation', 'desh'],
    zip: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postalcode', 'pin', 'pincode', 'pin_code'],
    pincode: ['pincode', 'pin_code', 'pin', 'postal_code', 'zip', 'zipcode', 'zip_code', 'area_code'],
    place_of_birth: ['place_of_birth', 'birth_place', 'birthplace', 'pob', 'born_at', 'birth_city'],
    
    // === DATE VARIATIONS ===
    date_of_birth: ['date_of_birth', 'dob', 'birth_date', 'birthdate', 'birthday', 'born', 'applicant_dob', 'date_birth', 'd_o_b'],
    date: ['date', 'application_date', 'submission_date', 'today_date', 'current_date'],
    
    // === ID DOCUMENT VARIATIONS ===
    aadhaar: ['aadhaar', 'aadhar', 'adhaar', 'adhar', 'aadhaar_number', 'aadhar_number', 'aadhaar_no', 'aadhar_no', 'uid', 'uidai', 'aadhaar_card', 'aadhar_card'],
    aadhaar_number: ['aadhaar_number', 'aadhar_number', 'aadhaar_no', 'aadhar_no', 'aadhaar', 'aadhar', 'uid_number', 'uid', 'uidai_number', 'adhaar_number', 'adhar_number'],
    pan: ['pan', 'pan_number', 'pan_no', 'pan_card', 'permanent_account_number', 'pancard', 'pan_card_number'],
    pan_number: ['pan_number', 'pan_no', 'pan', 'pan_card_number', 'panno', 'permanent_account_number'],
    voter_id: ['voter_id', 'voterid', 'epic', 'epic_number', 'voter_card', 'election_card', 'voter_id_number', 'electoral_id'],
    passport: ['passport', 'passport_number', 'passport_no', 'travel_document'],
    driving_license: ['driving_license', 'driving_licence', 'dl', 'dl_number', 'license_number', 'licence_number', 'drivers_license'],
    ration_card: ['ration_card', 'ration_card_number', 'ration_no', 'bpl_card'],
    ration_card_number: ['ration_card_number', 'ration_card_no', 'ration_number', 'ration_card'],
    
    // === PERSONAL DETAILS ===
    age: ['age', 'applicant_age', 'your_age', 'current_age', 'years_old'],
    gender: ['gender', 'sex', 'male_female', 'applicant_gender'],
    nationality: ['nationality', 'citizenship', 'national', 'citizen_of'],
    religion: ['religion', 'faith', 'dharma'],
    caste: ['caste', 'community', 'jati', 'category', 'social_category'],
    category: ['category', 'caste', 'reservation_category', 'social_category', 'quota'],
    marital_status: ['marital_status', 'married', 'marriage_status', 'civil_status'],
    blood_group: ['blood_group', 'bloodgroup', 'blood_type', 'blood'],
    title: ['title', 'salutation', 'prefix', 'mr_mrs'],
    
    // === EDUCATION & OCCUPATION ===
    education: ['education', 'qualification', 'degree', 'highest_qualification', 'educational_qualification', 'edu_qualification', 'academic_qualification'],
    qualification: ['qualification', 'education', 'degree', 'educational_qualification', 'highest_education'],
    occupation: ['occupation', 'job', 'profession', 'work', 'designation', 'position', 'job_title', 'employment', 'vocation'],
    employment_type: ['employment_type', 'job_type', 'work_type', 'employment_status', 'job_status'],
    company: ['company', 'organization', 'employer', 'workplace', 'company_name', 'org', 'firm', 'office'],
    annual_income: ['annual_income', 'yearly_income', 'income', 'income_per_year', 'total_income', 'salary'],
    income: ['income', 'annual_income', 'monthly_income', 'salary', 'earnings'],
    income_source: ['income_source', 'source_of_income', 'income_from', 'earning_source'],
    source_of_income: ['source_of_income', 'income_source', 'earning_source', 'income_from'],
    
    // === BANK/FINANCIAL ===
    account_type: ['account_type', 'type_of_account', 'acc_type', 'bank_account_type'],
    account_number: ['account_number', 'account_no', 'acc_number', 'acc_no', 'bank_account', 'bank_account_number'],
    ifsc: ['ifsc', 'ifsc_code', 'ifsc_no', 'bank_ifsc', 'branch_code'],
    bank_name: ['bank_name', 'name_of_bank', 'bank'],
    branch_name: ['branch_name', 'branch', 'bank_branch'],
    initial_deposit: ['initial_deposit', 'opening_balance', 'first_deposit', 'deposit_amount'],
    
    // === APPLICATION SPECIFIC ===
    application_type: ['application_type', 'type_of_application', 'app_type', 'request_type'],
    purpose: ['purpose', 'reason', 'purpose_of', 'objective', 'requirement'],
    status: ['status', 'application_status', 'current_status'],
    relation_type: ['relation_type', 'relationship', 'relation', 'relative_type'],
    vehicle_class: ['vehicle_class', 'vehicle_type', 'license_type', 'licence_type', 'dl_type'],
    booklet_type: ['booklet_type', 'passport_type', 'pages'],
    identification_mark1: ['identification_mark1', 'identification_mark', 'id_mark', 'id_mark1', 'visible_mark'],
    identification_mark2: ['identification_mark2', 'id_mark2', 'second_mark'],
    residence_since: ['residence_since', 'residing_since', 'living_since', 'stay_since', 'years_of_residence'],
  };

  // Find the best matching form field for an extracted OCR field
  const findMatchingFormField = (extractedKey, formFields) => {
    const normalizedKey = extractedKey.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    // 1. Direct exact match
    const exactMatch = formFields.find(f => 
      f.name.toLowerCase() === normalizedKey || 
      f.label?.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') === normalizedKey
    );
    if (exactMatch) return exactMatch;
    
    // 2. Check if form field name/label contains the extracted key
    const containsMatch = formFields.find(f => {
      const fname = f.name.toLowerCase();
      const flabel = (f.label || '').toLowerCase();
      return fname.includes(normalizedKey) || normalizedKey.includes(fname) ||
             flabel.includes(normalizedKey) || normalizedKey.includes(flabel.replace(/[^a-z0-9]/g, ''));
    });
    if (containsMatch) return containsMatch;
    
    // 3. Check alias mappings
    const aliases = FIELD_ALIASES[normalizedKey] || [];
    for (const alias of aliases) {
      const aliasMatch = formFields.find(f => {
        const fname = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const flabel = (f.label || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        return fname.includes(alias) || alias.includes(fname) ||
               flabel.includes(alias) || alias.includes(flabel);
      });
      if (aliasMatch) return aliasMatch;
    }
    
    // 4. Reverse check - see if form field has aliases that match extracted key
    for (const [canonical, aliasList] of Object.entries(FIELD_ALIASES)) {
      if (aliasList.some(a => normalizedKey.includes(a) || a.includes(normalizedKey))) {
        // Found a match in aliases, now find form field matching canonical or any alias
        const reverseMatch = formFields.find(f => {
          const fname = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const flabel = (f.label || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
          return fname.includes(canonical) || canonical.includes(fname) ||
                 flabel.includes(canonical) || canonical.includes(flabel) ||
                 aliasList.some(a => fname.includes(a) || flabel.includes(a));
        });
        if (reverseMatch) return reverseMatch;
      }
    }
    
    return null;
  };

  const handleOcrUpload = async (event)=>{
    const file = event.target.files && event.target.files[0];
    if(!file){ return; }
    setError("");
    setOcrStatus("📤 Uploading document...");
    setOcrLoading(true);
    
    try{
      // Step 1: Extract text/fields from document via OCR
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/ocr/extract`, { method: "POST", body: fd });
      if(!res.ok){
        const msg = await res.json().catch(()=>({ detail: "Unable to extract fields" }));
        throw new Error(msg.detail || "Unable to extract fields");
      }
      const data = await res.json();
      const extracted = data.fields || {};
      
      if (Object.keys(extracted).length === 0) {
        setOcrStatus("⚠️ No fields detected in document");
        setStatus("OCR completed but no data found. Try a clearer image.");
        setOcrLoading(false);
        event.target.value = "";
        return;
      }
      
      // Step 2: Try AI-powered matching first
      let aiMatched = {};
      let usedAI = false;
      
      setOcrStatus("🤖 AI analyzing fields...");
      
      try {
        const matchRes = await fetch(`${API_BASE}/ocr/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ocr_fields: extracted,
            form_fields: activeFields.map(f => ({
              name: f.name,
              label: f.label || f.name,
              type: f.type || "text"
            }))
          })
        });
        
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          aiMatched = matchData.matched || {};
          usedAI = matchData.ai_powered && Object.keys(aiMatched).length > 0;
        }
      } catch (aiErr) {
        console.log("AI matching unavailable, using local matching:", aiErr);
      }
      
      // Step 3: Apply AI matches, then fill remaining with local alias matching
      let matchedCount = 0;
      setValues(prev => {
        const next = { ...prev };
        const alreadyMatched = new Set();
        
        // First apply AI matches (higher accuracy)
        for (const [fieldName, value] of Object.entries(aiMatched)) {
          const field = activeFields.find(f => f.name === fieldName);
          if (field && value) {
            next[fieldName] = sanitizeFieldValue(field, value);
            alreadyMatched.add(fieldName);
            matchedCount++;
          }
        }
        
        // Then try local matching for any remaining unmatched fields
        for (const [extractedKey, extractedValue] of Object.entries(extracted)) {
          if (!extractedValue) continue;
          
          const matchedField = findMatchingFormField(extractedKey, activeFields);
          
          if (matchedField && !alreadyMatched.has(matchedField.name)) {
            next[matchedField.name] = sanitizeFieldValue(matchedField, extractedValue);
            alreadyMatched.add(matchedField.name);
            matchedCount++;
          }
        }
        
        return next;
      });
      
      if (matchedCount > 0) {
        const methodLabel = usedAI ? "🤖 AI" : "🔍 Smart";
        setOcrStatus(`✅ ${methodLabel}: Matched ${matchedCount} field(s)`);
        setStatus(`Form auto-filled: ${matchedCount} field(s) matched${usedAI ? " using AI" : ""}`);
      } else {
        setOcrStatus("⚠️ No matching fields found");
        setStatus("OCR completed but no fields matched. Check field names in your document.");
      }
    }catch(err){
      setError(err.message);
      setOcrStatus("❌ OCR failed");
    }
    setOcrLoading(false);
    event.target.value = "";
  };

  async function handleSubmit(e){
    e.preventDefault();
    if(!selectedForm) return;
    if(!token){ setError("Login required to submit forms"); return; }
    setSubmitting(true); setError(""); setStatus("");
    try{
      const res = await fetch(`${API_BASE}/forms/${selectedForm.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: values }),
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to submit" }));
        throw new Error(err.detail || "Unable to submit");
      }
      const data = await res.json();
      setResponseId(data.response_id);
      setStatus("Form saved successfully. Use the download button below to keep a copy.");
    }catch(err){
      setError(err.message);
    }
    setSubmitting(false);
  }

  async function handleDownload(){
    if(!selectedForm || !responseId || !token) return;
    setError("");
    try{
      const res = await fetch(`${API_BASE}/forms/${selectedForm.id}/responses/${responseId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to download" }));
        throw new Error(err.detail || "Unable to download");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedForm.title || "form"}-${responseId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }catch(err){
      setError(err.message);
    }
  }

  async function handleDownloadPdf(){
    if(!selectedForm || !responseId || !token){
      setError("Save a response first to generate the PDF");
      return;
    }
    setError("");
    try{
      const res = await fetch(`${API_BASE}/forms/${selectedForm.id}/responses/${responseId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to download PDF" }));
        throw new Error(err.detail || "Unable to download PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedForm.title || "form"}-${responseId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }catch(err){
      setError(err.message);
    }
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 className="section-title" style={{ fontSize: 18, marginBottom: 4 }}>Form Templates</h3>
            <p className="muted" style={{ margin: 0 }}>Select a form to begin filling</p>
          </div>
          <span className="badge">{forms.length} available</span>
        </div>

        {/* Search Forms */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Search forms by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: "100%", 
                paddingLeft: 16,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "var(--muted)"
                }}
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              Found {filteredForms.length} of {forms.length} forms
            </p>
          )}
        </div>
        
        {forms.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No forms available yet</p>
            <p className="muted">Ask an admin to create form templates</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredForms.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p className="muted">No forms match "{searchQuery}"</p>
              </div>
            ) : filteredForms.map(template => (
              <button
                key={template.id}
                className="btn"
                style={{ 
                  justifyContent: "flex-start", 
                  padding: "16px 20px",
                  background: selectedForm?.id === template.id 
                    ? "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)" 
                    : "rgba(0, 245, 255, 0.03)",
                  border: selectedForm?.id === template.id 
                    ? "2px solid var(--primary)" 
                    : "1px solid var(--border)",
                  borderRadius: 14,
                }}
                onClick={()=>selectForm(template)}
              >
                <div style={{ textAlign: "left", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{template.title}</strong>
                    {selectedForm?.id === template.id && <span className="badge primary">Selected</span>}
                  </div>
                  {template.description && (
                    <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>{template.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="section-title" style={{ fontSize: 18, marginBottom: 0 }}>Form Filling</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selectedForm && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={copyShareLink}
                title="Copy shareable link"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                🔗 {copyFeedback || "Share"}
              </button>
            )}
            {selectedForm && <span className="badge success">Active</span>}
          </div>
        </div>
        
        {!selectedForm && (
          <div className="empty-state">
            <div className="icon">👈</div>
            <p>Select a form to get started</p>
            <p className="muted">Choose from the templates on the left</p>
          </div>
        )}
        
        {error && <div className="error">⚠️ {error}</div>}
        {status && <div className="success">✅ {status}</div>}
        
        {selectedForm && (
          <>
            {/* Assistive Tools Section */}
            <div style={{ 
              background: "linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)", 
              borderRadius: 16, 
              padding: 20, 
              marginBottom: 24,
              border: "1px solid rgba(0, 245, 255, 0.2)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 15 }}>🎤 Assistive Tools</h4>
                <span className={`badge ${browserListening ? 'success' : ''}`}>
                  {browserListening ? 'Listening...' : 'Ready'}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                Use voice commands like "Set email to jane@example.com" or upload a document for OCR autofill.
              </p>
              
              <div className="actions" style={{ gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn ${browserListening ? 'btn-danger' : 'btn-primary'}`}
                  onClick={startBrowserStt}
                  disabled={!browserSupported}
                  style={{ padding: "10px 18px" }}
                >
                  {browserListening ? '⏹ Stop' : '🎤 Voice Fill'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={speakText}
                  disabled={ttsLoading}
                  style={{ padding: "10px 18px" }}
                >
                  {ttsLoading ? <><span className="spinner"></span></> : '🔊 Read Aloud'}
                </button>
                <label className="btn btn-primary" style={{ cursor: "pointer", padding: "10px 18px" }}>
                  📄 OCR Import
                  <input type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={handleOcrUpload} disabled={ocrLoading} />
                </label>
              </div>

              <div className="output" style={{ minHeight: 50, fontSize: 13, marginBottom: 12 }}>
                {activeFieldName
                  ? (interimTranscript || values[activeFieldName] || "Speak to fill this field...")
                  : "Click a field then speak, or use commands like 'Set name to John'"}
              </div>

              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                {voiceStatus} • {ocrLoading ? "Processing OCR..." : ocrStatus}
              </p>

              {audioUrl && (
                <audio controls src={audioUrl} style={{ width: "100%", marginTop: 12, height: 36 }} />
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {activeFields.length === 0 && (
                  <p className="muted" style={{ gridColumn: "1 / span 2" }}>This form has no fields defined.</p>
                )}
                {activeFields.map(field => (
                  <div 
                    key={field.name} 
                    className="field" 
                    style={{ 
                      gridColumn: field.fullWidth ? "1 / span 2" : "auto",
                      background: activeFieldName === field.name ? "rgba(99,102,241,0.04)" : "transparent",
                      padding: activeFieldName === field.name ? 12 : 0,
                      borderRadius: 12,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <label>
                      {field.label || field.name}
                      {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                    </label>
                    <div style={{ position: "relative" }}>
                      {field.type === "textarea" ? (
                        <textarea
                          rows={field.rows || 4}
                          value={values[field.name] ?? ""}
                          onChange={(e)=>handleChange(field, e.target.value)}
                          onFocus={()=>handleFieldFocus(field.name)}
                          placeholder={field.placeholder}
                          required={field.required}
                          style={{ width: "100%" }}
                        />
                      ) : (
                        <input
                          type={field.type || "text"}
                          value={values[field.name] ?? ""}
                          onChange={(e)=>handleChange(field, e.target.value)}
                          onFocus={()=>handleFieldFocus(field.name)}
                          placeholder={field.placeholder}
                          required={field.required}
                          style={{ width: "100%" }}
                        />
                      )}
                      {language === "hi" && (field.type === "text" || field.type === "textarea") && values[field.name] && (
                        <button
                          type="button"
                          onClick={() => handleTranslate(field.name)}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: field.type === "textarea" ? 12 : "50%",
                            transform: field.type === "textarea" ? "none" : "translateY(-50%)",
                            background: "rgba(255,255,255,0.8)",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            padding: "2px 6px",
                            zIndex: 5
                          }}
                          title="Translate to Hindi"
                        >
                          अ
                        </button>
                      )}
                    </div>
                    {isEmailField(field) && (
                      <p className="field-hint">Auto-formatted to lowercase, no spaces</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="divider"></div>
              
              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
                  {submitting ? <><span className="spinner"></span> Saving...</> : '💾 Save Response'}
                </button>
                <button
                  className="btn btn-success"
                  type="button"
                  disabled={!responseId}
                  onClick={handleDownload}
                >
                  📥 JSON
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={!responseId}
                  onClick={handleDownloadPdf}
                >
                  📄 PDF
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
