import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config";
import { useAuth } from "../AuthContext";

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
    recognition.lang = "en";
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

  const handleOcrUpload = async (event)=>{
    const file = event.target.files && event.target.files[0];
    if(!file){ return; }
    setError("");
    setOcrStatus("Uploading document...");
    setOcrLoading(true);
    try{
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/ocr/extract`, { method: "POST", body: fd });
      if(!res.ok){
        const msg = await res.json().catch(()=>({ detail: "Unable to extract fields" }));
        throw new Error(msg.detail || "Unable to extract fields");
      }
      const data = await res.json();
      const extracted = data.fields || {};
      setValues(prev => {
        const next = { ...prev };
        activeFields.forEach(field => {
          if(extracted[field.name]){
            next[field.name] = sanitizeFieldValue(field, extracted[field.name]);
          }
        });
        return next;
      });
      setOcrStatus("Fields updated from OCR");
      setStatus("Form auto-filled from document");
    }catch(err){
      setError(err.message);
      setOcrStatus("OCR failed");
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
        
        {forms.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No forms available yet</p>
            <p className="muted">Ask an admin to create form templates</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {forms.map(template => (
              <button
                key={template.id}
                className="btn"
                style={{ 
                  justifyContent: "flex-start", 
                  padding: "16px 20px",
                  background: selectedForm?.id === template.id 
                    ? "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)" 
                    : "rgba(15,23,42,0.02)",
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
          {selectedForm && <span className="badge success">Active</span>}
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
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
              borderRadius: 16, 
              padding: 20, 
              marginBottom: 24,
              border: "1px solid var(--border)"
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
                  className="btn btn-ghost"
                  onClick={speakText}
                  disabled={ttsLoading}
                >
                  {ttsLoading ? <><span className="spinner spinner-dark"></span></> : '🔊 Read Aloud'}
                </button>
                <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
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
                    {field.type === "textarea" ? (
                      <textarea
                        rows={field.rows || 4}
                        value={values[field.name] ?? ""}
                        onChange={(e)=>handleChange(field, e.target.value)}
                        onFocus={()=>handleFieldFocus(field.name)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={values[field.name] ?? ""}
                        onChange={(e)=>handleChange(field, e.target.value)}
                        onFocus={()=>handleFieldFocus(field.name)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
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
