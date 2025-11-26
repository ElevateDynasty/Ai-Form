import React, { createContext, useContext, useState, useEffect } from "react";

// Supported languages - Only English and Hindi
export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
];

// Translation strings
const TRANSLATIONS = {
  en: {
    // Common
    app_name: "AI Forms",
    app_tagline: "Smart Form Platform",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    download: "Download",
    submit: "Submit",
    close: "Close",
    
    // Navigation
    nav_home: "Home",
    nav_ocr: "OCR",
    nav_voice: "Voice",
    nav_forms: "Forms",
    nav_pdf: "PDF Fill",
    nav_ai: "AI Tools",
    nav_manage: "Manage",
    logout: "Logout",
    logged_in_as: "Logged in as",
    
    // Login Page
    login_title: "Sign in or register",
    login_subtitle: "Choose your role and manage forms with OCR + Voice automation.",
    login_tab: "Login",
    register_tab: "Register",
    username: "Username",
    password: "Password",
    remember_me: "Remember me on this device",
    continue_btn: "Continue",
    create_account: "Create account",
    signing_in: "Signing in...",
    creating_account: "Creating account...",
    quick_access: "Need quick access?",
    demo_user: "Demo User",
    demo_admin: "Demo Admin",
    role_user: "User",
    role_admin: "Admin",
    role_user_desc: "Auto-fill and download forms",
    role_admin_desc: "Review submissions and manage templates",
    
    // Dashboard
    welcome_title: "Your intelligent form management hub",
    welcome_subtitle: "Convert documents to forms with OCR, fill them using voice commands, and export professional PDFs — all from one unified platform.",
    scan_docs: "Scan Documents",
    scan_docs_desc: "PDF & image OCR",
    voice_input: "Voice Input",
    voice_input_desc: "Speech to text",
    fill_forms: "Fill Forms",
    fill_forms_desc: "Smart autofill",
    pdf_templates: "PDF Templates",
    pdf_templates_desc: "Merge & export",
    text_ai: "Text AI",
    text_ai_desc: "Clean & summarize",
    manage_forms: "Manage Forms",
    manage_forms_desc: "Visual builder",
    how_it_works: "How it works",
    step_ingest: "Ingest",
    step_ingest_desc: "Upload documents or start from templates. Our OCR extracts key data automatically.",
    step_enrich: "Enrich",
    step_enrich_desc: "Add voice input, merge OCR results, and validate entries with smart hints.",
    step_validate: "Validate",
    step_validate_desc: "Review normalized data, check required fields, and fix any issues.",
    step_export: "Export",
    step_export_desc: "Download as JSON, generate PDFs, or share directly from the platform.",
    doc_to_form: "Document → Form",
    doc_to_form_desc: "Upload any PDF or image and let AI draft the form structure automatically.",
    voice_filling: "Voice Filling",
    voice_filling_desc: "Speak naturally to fill forms. Say 'Set email to john@example.com' and watch the magic.",
    smart_export: "Smart Export",
    smart_export_desc: "Every submission can be downloaded as JSON or a professionally formatted PDF.",
    try_now: "Try it now",
    start_filling: "Start filling",
    view_forms: "View forms",
    open_ai_tools: "Open AI tools",
    
    // OCR Page
    ocr_title: "Document Scanner",
    ocr_subtitle: "Extract text and fields from documents using OCR",
    upload_document: "Upload Document",
    drop_files: "Drop files here or click to upload",
    supported_formats: "PDF, PNG, JPG supported",
    extracted_fields: "Extracted Fields",
    no_fields: "No fields extracted yet",
    processing: "Processing...",
    
    // Audio Page
    voice_to_text: "Voice to Text",
    speech_recognition: "Speech Recognition",
    text_to_speech: "Text to Speech",
    audio_generation: "Audio Generation",
    spoken_language: "Spoken Language",
    live_transcript: "Live Transcript",
    start_microphone: "Start Microphone",
    stop_recording: "Stop Recording",
    text_to_speak: "Text to Speak",
    voice_language: "Voice Language",
    generate_audio: "Generate Audio",
    generating_audio: "Generating Audio...",
    audio_player: "Audio Player",
    ready_to_play: "Ready to play",
    recording: "Recording",
    ready: "Ready",
    words: "words",
    characters: "characters",
    
    // Forms Page
    forms_title: "Form Templates",
    select_template: "Select a Template",
    no_templates: "No form templates available",
    fill_form: "Fill Form",
    save_response: "Save Response",
    saving: "Saving...",
    assistive_tools: "Assistive Tools",
    voice_fill: "Voice Fill",
    ocr_import: "OCR Import",
    text_to_speech_btn: "Read Aloud",
    your_responses: "Your Responses",
    no_responses: "No saved responses yet",
    download_json: "Download JSON",
    download_pdf: "Download PDF",
    
    // AI/LLM Page
    ai_title: "AI Text Tools",
    ai_subtitle: "Process text with AI-powered tools",
    clean_text: "Clean Text",
    summarize: "Summarize",
    key_phrases: "Key Phrases",
    input_text: "Input Text",
    output_result: "Result",
    process: "Process",
    
    // PDF Fill Page
    pdf_fill_title: "PDF Auto-Fill",
    pdf_fill_subtitle: "Merge data with PDF templates",
    upload_pdf: "Upload PDF Template",
    field_values: "Field Values",
    text_editor: "Text Editor",
    upload_json: "Upload JSON",
    generate_pdf: "Generate & Download Filled PDF",
    how_it_works_pdf: "How it works",
    
    // Admin Page
    admin_title: "Form Template Manager",
    create_template: "Create Template",
    edit_template: "Edit Template",
    form_title: "Form Title",
    form_description: "Description",
    form_fields: "Form Fields",
    add_field: "Add Field",
    field_name: "Field Name",
    field_label: "Label",
    field_type: "Type",
    field_required: "Required",
    import_document: "Import from Document",
    saved_templates: "Saved Templates",
    
    // Accessibility
    accessibility_mode: "Accessibility Mode",
    high_contrast: "High Contrast",
    voice_navigation: "Voice Navigation",
    
    // Errors & Status
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Info",
    
    // Language
    language: "Language",
    select_language: "Select Language",
  },
  
  hi: {
    // Common
    app_name: "AI फॉर्म्स",
    app_tagline: "स्मार्ट फॉर्म प्लेटफॉर्म",
    loading: "लोड हो रहा है...",
    save: "सहेजें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    edit: "संपादित करें",
    download: "डाउनलोड",
    submit: "जमा करें",
    close: "बंद करें",
    
    // Navigation
    nav_home: "होम",
    nav_ocr: "OCR",
    nav_voice: "आवाज़",
    nav_forms: "फॉर्म्स",
    nav_pdf: "PDF भरें",
    nav_ai: "AI टूल्स",
    nav_manage: "प्रबंधन",
    logout: "लॉगआउट",
    logged_in_as: "लॉग इन",
    
    // Login Page
    login_title: "साइन इन या रजिस्टर करें",
    login_subtitle: "अपनी भूमिका चुनें और OCR + वॉइस ऑटोमेशन के साथ फॉर्म प्रबंधित करें।",
    login_tab: "लॉगिन",
    register_tab: "रजिस्टर",
    username: "यूज़रनेम",
    password: "पासवर्ड",
    remember_me: "मुझे इस डिवाइस पर याद रखें",
    continue_btn: "जारी रखें",
    create_account: "खाता बनाएं",
    signing_in: "साइन इन हो रहा है...",
    creating_account: "खाता बना रहा है...",
    quick_access: "त्वरित पहुंच चाहिए?",
    demo_user: "डेमो यूज़र",
    demo_admin: "डेमो एडमिन",
    role_user: "यूज़र",
    role_admin: "एडमिन",
    role_user_desc: "फॉर्म ऑटो-फिल और डाउनलोड करें",
    role_admin_desc: "सबमिशन देखें और टेम्पलेट प्रबंधित करें",
    
    // Dashboard
    welcome_title: "आपका बुद्धिमान फॉर्म प्रबंधन केंद्र",
    welcome_subtitle: "OCR के साथ दस्तावेज़ों को फॉर्म में बदलें, वॉइस कमांड से भरें, और पेशेवर PDF एक्सपोर्ट करें।",
    scan_docs: "दस्तावेज़ स्कैन करें",
    scan_docs_desc: "PDF और इमेज OCR",
    voice_input: "वॉइस इनपुट",
    voice_input_desc: "स्पीच टू टेक्स्ट",
    fill_forms: "फॉर्म भरें",
    fill_forms_desc: "स्मार्ट ऑटोफिल",
    pdf_templates: "PDF टेम्पलेट",
    pdf_templates_desc: "मर्ज और एक्सपोर्ट",
    text_ai: "टेक्स्ट AI",
    text_ai_desc: "साफ़ और सारांश",
    manage_forms: "फॉर्म प्रबंधन",
    manage_forms_desc: "विज़ुअल बिल्डर",
    how_it_works: "यह कैसे काम करता है",
    step_ingest: "इनपुट",
    step_ingest_desc: "दस्तावेज़ अपलोड करें। हमारा OCR स्वचालित रूप से डेटा निकालता है।",
    step_enrich: "समृद्ध",
    step_enrich_desc: "वॉइस इनपुट जोड़ें, OCR परिणाम मर्ज करें।",
    step_validate: "सत्यापित",
    step_validate_desc: "डेटा की समीक्षा करें, आवश्यक फ़ील्ड जांचें।",
    step_export: "एक्सपोर्ट",
    step_export_desc: "JSON या PDF के रूप में डाउनलोड करें।",
    doc_to_form: "दस्तावेज़ → फॉर्म",
    doc_to_form_desc: "कोई भी PDF या इमेज अपलोड करें और AI फॉर्म संरचना बनाए।",
    voice_filling: "वॉइस फिलिंग",
    voice_filling_desc: "स्वाभाविक रूप से बोलें। 'ईमेल john@example.com सेट करें' बोलें।",
    smart_export: "स्मार्ट एक्सपोर्ट",
    smart_export_desc: "हर सबमिशन JSON या PDF के रूप में डाउनलोड किया जा सकता है।",
    try_now: "अभी आज़माएं",
    start_filling: "भरना शुरू करें",
    view_forms: "फॉर्म देखें",
    open_ai_tools: "AI टूल्स खोलें",
    
    // OCR Page
    ocr_title: "दस्तावेज़ स्कैनर",
    ocr_subtitle: "OCR का उपयोग करके दस्तावेज़ों से टेक्स्ट निकालें",
    upload_document: "दस्तावेज़ अपलोड करें",
    drop_files: "फ़ाइलें यहां छोड़ें या अपलोड करने के लिए क्लिक करें",
    supported_formats: "PDF, PNG, JPG समर्थित",
    extracted_fields: "निकाले गए फ़ील्ड",
    no_fields: "अभी तक कोई फ़ील्ड नहीं निकाला गया",
    processing: "प्रोसेसिंग...",
    
    // Audio Page
    voice_to_text: "वॉइस से टेक्स्ट",
    speech_recognition: "स्पीच रिकग्निशन",
    text_to_speech: "टेक्स्ट से स्पीच",
    audio_generation: "ऑडियो जनरेशन",
    spoken_language: "बोली जाने वाली भाषा",
    live_transcript: "लाइव ट्रांसक्रिप्ट",
    start_microphone: "माइक्रोफ़ोन शुरू करें",
    stop_recording: "रिकॉर्डिंग बंद करें",
    text_to_speak: "बोलने के लिए टेक्स्ट",
    voice_language: "वॉइस भाषा",
    generate_audio: "ऑडियो बनाएं",
    generating_audio: "ऑडियो बना रहा है...",
    audio_player: "ऑडियो प्लेयर",
    ready_to_play: "चलाने के लिए तैयार",
    recording: "रिकॉर्डिंग",
    ready: "तैयार",
    words: "शब्द",
    characters: "अक्षर",
    
    // Forms Page
    forms_title: "फॉर्म टेम्पलेट्स",
    select_template: "एक टेम्पलेट चुनें",
    no_templates: "कोई फॉर्म टेम्पलेट उपलब्ध नहीं",
    fill_form: "फॉर्म भरें",
    save_response: "प्रतिक्रिया सहेजें",
    saving: "सहेज रहा है...",
    assistive_tools: "सहायक उपकरण",
    voice_fill: "वॉइस भरें",
    ocr_import: "OCR इम्पोर्ट",
    text_to_speech_btn: "जोर से पढ़ें",
    your_responses: "आपकी प्रतिक्रियाएं",
    no_responses: "अभी तक कोई सहेजी गई प्रतिक्रियाएं नहीं",
    download_json: "JSON डाउनलोड",
    download_pdf: "PDF डाउनलोड",
    
    // AI/LLM Page
    ai_title: "AI टेक्स्ट टूल्स",
    ai_subtitle: "AI-संचालित टूल्स के साथ टेक्स्ट प्रोसेस करें",
    clean_text: "टेक्स्ट साफ़ करें",
    summarize: "सारांश",
    key_phrases: "मुख्य वाक्यांश",
    input_text: "इनपुट टेक्स्ट",
    output_result: "परिणाम",
    process: "प्रोसेस",
    
    // PDF Fill Page
    pdf_fill_title: "PDF ऑटो-फिल",
    pdf_fill_subtitle: "PDF टेम्पलेट्स के साथ डेटा मर्ज करें",
    upload_pdf: "PDF टेम्पलेट अपलोड करें",
    field_values: "फ़ील्ड मान",
    text_editor: "टेक्स्ट एडिटर",
    upload_json: "JSON अपलोड",
    generate_pdf: "भरा हुआ PDF बनाएं और डाउनलोड करें",
    how_it_works_pdf: "यह कैसे काम करता है",
    
    // Admin Page
    admin_title: "फॉर्म टेम्पलेट मैनेजर",
    create_template: "टेम्पलेट बनाएं",
    edit_template: "टेम्पलेट संपादित करें",
    form_title: "फॉर्म शीर्षक",
    form_description: "विवरण",
    form_fields: "फॉर्म फ़ील्ड्स",
    add_field: "फ़ील्ड जोड़ें",
    field_name: "फ़ील्ड नाम",
    field_label: "लेबल",
    field_type: "प्रकार",
    field_required: "आवश्यक",
    import_document: "दस्तावेज़ से इम्पोर्ट",
    saved_templates: "सहेजे गए टेम्पलेट्स",
    
    // Accessibility
    accessibility_mode: "एक्सेसिबिलिटी मोड",
    high_contrast: "हाई कॉन्ट्रास्ट",
    voice_navigation: "वॉइस नेविगेशन",
    
    // Errors & Status
    error: "त्रुटि",
    success: "सफलता",
    warning: "चेतावनी",
    info: "जानकारी",
    
    // Language
    language: "भाषा",
    select_language: "भाषा चुनें",
  },
};

const LanguageContext = createContext(null);

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem("ai_form_language");
    if (saved && TRANSLATIONS[saved]) return saved;
    
    // Try to detect browser language
    const browserLang = navigator.language?.split("-")[0];
    if (browserLang && TRANSLATIONS[browserLang]) return browserLang;
    
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("ai_form_language", language);
    // Set document direction for RTL languages
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  // Translation function
  const t = (key) => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
    return translations[key] || TRANSLATIONS.en[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    languages: LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;
