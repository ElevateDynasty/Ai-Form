import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";

const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "date",
  "textarea",
  "select",
];

const DEFAULT_FIELDS = [
  { name: "full_name", label: "Full Name", type: "text", required: true, fullWidth: true },
  { name: "email", label: "Email", type: "email", required: true },
];

const cloneDefaultFields = ()=> DEFAULT_FIELDS.map(field => ({ ...field }));

const DEFAULT_SCHEMA = { fields: cloneDefaultFields() };

const createEmptyField = ()=> ({
  name: "",
  label: "",
  type: "text",
  required: false,
  fullWidth: false,
  placeholder: "",
  default: "",
});

const normalizeSchema = (schema)=>{
  if(!schema || typeof schema !== "object" || Array.isArray(schema)){
    return { fields: cloneDefaultFields(), meta: {} };
  }
  const { fields, ...rest } = schema;
  if(Array.isArray(fields) && fields.length){
    return { fields: fields.map(field => ({ ...field })), meta: rest };
  }
  return { fields: cloneDefaultFields(), meta: rest };
};

export default function AdminFormsPage(){
  const { token, role } = useAuth();
  const { language } = useLanguage();
  const [forms, setForms] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    fields: cloneDefaultFields(),
    meta: {},
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importText, setImportText] = useState("");
  const [ingestStatus, setIngestStatus] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [promptStatus, setPromptStatus] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(()=>{ fetchForms(); }, []);

  async function fetchForms(){
    try{
      const res = await fetch(`${API_BASE}/forms`);
      if(!res.ok) throw new Error("Unable to fetch forms");
      const data = await res.json();
      setForms(data.items || []);
    }catch(err){
      setError(err.message);
    }
  }

  const resetForm = ()=>{
    setEditingId(null);
    setFormState({
      title: "",
      description: "",
      fields: cloneDefaultFields(),
      meta: {},
    });
    setShowAdvanced(false);
    setImportText("");
    setIngestStatus("");
  };

  async function handleSubmit(e){
    e.preventDefault();
    setStatus(""); setError("");
    const trimmedFields = formState.fields.map(field => ({
      ...field,
      name: (field.name || "").trim(),
      label: (field.label || "").trim(),
    }));
    if(!trimmedFields.length){
      setError("Add at least one field to the form");
      return;
    }
    if(trimmedFields.some(field => !field.name || !field.label)){
      setError("Each field needs a name and label");
      return;
    }
    const lowerNames = trimmedFields.map(field => field.name.toLowerCase());
    const hasDuplicates = new Set(lowerNames).size !== lowerNames.length;
    if(hasDuplicates){
      setError("Field names must be unique");
      return;
    }
    const schemaObj = {
      ...formState.meta,
      fields: trimmedFields.map(field => {
        const normalized = { ...field };
        if(field.type !== "select"){
          delete normalized.options;
        }
        if(field.type !== "textarea"){
          delete normalized.rows;
        }
        if(!normalized.placeholder){ delete normalized.placeholder; }
        if(!normalized.default && normalized.default !== 0){ delete normalized.default; }
        if(!normalized.aliases){ delete normalized.aliases; }
        return normalized;
      }),
    };
    const payload = {
      title: formState.title,
      description: formState.description,
      template_schema: schemaObj,
    };
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `${API_BASE}/forms/${editingId}` : `${API_BASE}/forms`;
    try{
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to save form" }));
        throw new Error(err.detail || "Unable to save form");
      }
      await res.json();
      setStatus(editingId ? "Form updated" : "Form created");
      resetForm();
      fetchForms();
    }catch(err){
      setError(err.message);
    }
  }

  async function handleDelete(id){
    if(!window.confirm("Delete this form?")) return;
    setError("");
    try{
      const res = await fetch(`${API_BASE}/forms/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to delete" }));
        throw new Error(err.detail || "Unable to delete");
      }
      setStatus("Form deleted");
      if(editingId === id) resetForm();
      fetchForms();
    }catch(err){
      setError(err.message);
    }
  }

  const handleEdit = (template)=>{
    setEditingId(template.id);
    const normalized = normalizeSchema(template.schema || DEFAULT_SCHEMA);
    setFormState({
      title: template.title,
      description: template.description || "",
      fields: normalized.fields.length ? normalized.fields : cloneDefaultFields(),
      meta: normalized.meta,
    });
    setShowAdvanced(false);
    setImportText("");
    setIngestStatus("");
    setPromptText("");
    setPromptStatus("");
    setStatus(""); setError("");
  };

  const schemaPreview = useMemo(()=>(
    JSON.stringify({ ...formState.meta, fields: formState.fields }, null, 2)
  ), [formState.fields, formState.meta]);

  const updateField = (index, patch)=>{
    setFormState(prev => ({
      ...prev,
      fields: prev.fields.map((field, idx)=> idx === index ? { ...field, ...patch } : field),
    }));
  };

  const removeField = (index)=>{
    setFormState(prev => ({
      ...prev,
      fields: prev.fields.filter((_, idx)=> idx !== index),
    }));
  };

  const duplicateField = (index)=>{
    setFormState(prev => {
      const clone = { ...prev.fields[index] };
      clone.name = `${clone.name || "field"}_${Date.now().toString().slice(-4)}`;
      const fields = [...prev.fields];
      fields.splice(index + 1, 0, clone);
      return { ...prev, fields };
    });
  };

  const addField = ()=>{
    setFormState(prev => ({
      ...prev,
      fields: [...prev.fields, createEmptyField()],
    }));
  };

  const handleImportSchema = ()=>{
    if(!importText.trim()){
      setError("Paste schema JSON to import");
      return;
    }
    try{
      const parsed = JSON.parse(importText);
      const normalized = normalizeSchema(parsed);
      setFormState(prev => ({
        ...prev,
        fields: normalized.fields,
        meta: normalized.meta,
      }));
      setShowAdvanced(false);
      setImportText("");
      setStatus("Builder updated from JSON");
      setError("");
    }catch(err){
      setError("Invalid schema JSON");
    }
  };

  const handleDocumentIngest = async (event)=>{
    const file = event.target.files && event.target.files[0];
    if(!file){
      return;
    }
    setError("");
    setIngestStatus("Analyzing document...");
    setIngestLoading(true);
    try{
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/forms/ingest`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to analyze document" }));
        throw new Error(err.detail || "Unable to analyze document");
      }
      const data = await res.json();
      const schema = data.schema || {};
      const normalized = normalizeSchema(schema);
      setFormState(prev => ({
        ...prev,
        fields: normalized.fields,
        meta: normalized.meta,
      }));
      setIngestStatus(`Imported ${normalized.fields.length} field${normalized.fields.length === 1 ? "" : "s"} from ${file.name}`);
    }catch(err){
      setError(err.message);
      setIngestStatus("Document analysis failed");
    }
    setIngestLoading(false);
    event.target.value = "";
  };

  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) {
      setError("Please enter a description of the form you want to create");
      return;
    }
    setError("");
    setPromptStatus("Generating form with AI...");
    setPromptLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forms/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ prompt: promptText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unable to generate form" }));
        throw new Error(err.detail || "Unable to generate form");
      }
      const data = await res.json();
      const schema = data.schema || {};
      const normalized = normalizeSchema(schema);
      
      // Auto-generate title from prompt if not set
      if (!formState.title && promptText.length > 0) {
        const autoTitle = promptText.length > 50 
          ? promptText.substring(0, 47) + "..." 
          : promptText;
        setFormState(prev => ({
          ...prev,
          title: autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1),
          fields: normalized.fields,
          meta: normalized.meta,
        }));
      } else {
        setFormState(prev => ({
          ...prev,
          fields: normalized.fields,
          meta: normalized.meta,
        }));
      }
      
      const generator = schema.meta?.generator === "openai" ? "AI" : "pattern matching";
      setPromptStatus(`Generated ${normalized.fields.length} field${normalized.fields.length === 1 ? "" : "s"} using ${generator}`);
      setPromptText("");
    } catch (err) {
      setError(err.message);
      setPromptStatus("Generation failed");
    }
    setPromptLoading(false);
  };

  const handleTranslate = async (text, callback) => {
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
        callback(data.translated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportResponses = async (formId, formTitle) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/forms/${formId}/responses/export`, {
        headers: authHeader,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "No responses to export" }));
        throw new Error(err.detail || "Unable to export responses");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formTitle || "form"}-responses.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported responses for "${formTitle}"`);
    } catch (err) {
      setError(err.message);
    }
  };

  if(role !== "admin"){
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ margin: "0 0 8px" }}>Admin Access Required</h3>
        <p className="muted">You need admin privileges to manage form templates.</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h3 className="section-title" style={{ fontSize: 20, marginBottom: 4 }}>
              {editingId ? "Edit Form Template" : "Create Form Template"}
            </h3>
            <p className="muted" style={{ margin: 0 }}>Design forms with the visual builder or import from documents</p>
          </div>
          <span className="badge primary">Admin</span>
        </div>

        {error && <div className="error">⚠️ {error}</div>}
        {status && <div className="success">✅ {status}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 24 }}>
            <div className="field" style={{ position: "relative" }}>
              <label>Form Title *</label>
              <input 
                type="text" 
                required 
                value={formState.title} 
                onChange={(e)=>setFormState({...formState, title: e.target.value})}
                placeholder="e.g., Employee Onboarding Form"
              />
              {language === "hi" && formState.title && (
                <button
                  type="button"
                  onClick={() => handleTranslate(formState.title, (val) => setFormState(prev => ({ ...prev, title: val })))}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(0%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    opacity: 0.6
                  }}
                  title="Translate to Hindi"
                >
                  🌐
                </button>
              )}
            </div>
            <div className="field" style={{ position: "relative" }}>
              <label>Description</label>
              <input 
                type="text" 
                value={formState.description} 
                onChange={(e)=>setFormState({...formState, description: e.target.value})}
                placeholder="Brief description of the form's purpose"
              />
              {language === "hi" && formState.description && (
                <button
                  type="button"
                  onClick={() => handleTranslate(formState.description, (val) => setFormState(prev => ({ ...prev, description: val })))}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(0%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    opacity: 0.6
                  }}
                  title="Translate to Hindi"
                >
                  🌐
                </button>
              )}
            </div>
          </div>

          {/* Document Import */}
          <div style={{ 
            background: "linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)", 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 24,
            border: "1px solid rgba(0, 245, 255, 0.2)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>📄 Import from Document</h4>
              {ingestLoading && <span className="badge warning animate-pulse">Analyzing...</span>}
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Upload a PDF or image to automatically detect form fields using OCR.
            </p>
            <label className={`file-drop-zone ${ingestLoading ? 'active' : ''}`} style={{ padding: 24 }}>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleDocumentIngest}
                disabled={ingestLoading}
              />
              <span style={{ fontSize: 32 }}>📂</span>
              <span style={{ fontWeight: 600 }}>Drop document or click to upload</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>PDF, PNG, JPG supported</span>
            </label>
            {ingestStatus && <p className="muted" style={{ fontSize: 13, marginTop: 12, textAlign: "center" }}>{ingestStatus}</p>}
          </div>

          {/* AI Prompt Generator */}
          <div style={{ 
            background: "linear-gradient(135deg, rgba(191, 0, 255, 0.08) 0%, rgba(255, 0, 255, 0.05) 100%)", 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 24,
            border: "1px solid rgba(191, 0, 255, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>🤖 Generate with AI</h4>
              {promptLoading && <span className="badge warning animate-pulse">Generating...</span>}
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Describe the form you need in natural language and let AI create the fields for you.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., Create a job application form with name, email, phone, resume upload, years of experience, and a cover letter section"
                disabled={promptLoading}
                rows={3}
                style={{ 
                  flex: 1, 
                  minWidth: 280,
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid rgba(191, 0, 255, 0.3)",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  resize: "vertical"
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateFromPrompt}
                disabled={promptLoading || !promptText.trim()}
                style={{ 
                  alignSelf: "flex-start",
                  background: "linear-gradient(135deg, #bf00ff 0%, #ff00ff 100%)",
                  minWidth: 140
                }}
              >
                {promptLoading ? "⏳ Generating..." : "✨ Generate"}
              </button>
            </div>
            {promptStatus && (
              <p className="muted" style={{ 
                fontSize: 13, 
                marginTop: 12, 
                textAlign: "center",
                color: promptStatus.includes("failed") ? "var(--error)" : "var(--success)"
              }}>
                {promptStatus}
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <p className="muted" style={{ fontSize: 11, opacity: 0.7 }}>
                💡 Tips: Be specific about field types (email, phone, date), required fields, and any dropdown options you need.
              </p>
            </div>
          </div>

          {/* Fields Builder */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>Form Fields ({formState.fields.length})</h4>
              <button type="button" className="btn btn-primary btn-sm" onClick={addField}>
                + Add Field
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {formState.fields.map((field, index)=>(
                <div 
                  key={`${field.name || "field"}-${index}`} 
                  className="card-flat"
                  style={{ 
                    background: "var(--card)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="badge">{index + 1}</span>
                      <strong style={{ fontSize: 14 }}>{field.label || `Field ${index + 1}`}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={()=>duplicateField(index)}>
                        📋 Clone
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={()=>removeField(index)}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                    <div className="field">
                      <label>Field Name *</label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e)=>updateField(index, { name: e.target.value })}
                        placeholder="e.g., full_name"
                      />
                    </div>
                    <div className="field" style={{ position: "relative" }}>
                      <label>Label *</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e)=>updateField(index, { label: e.target.value })}
                        placeholder="e.g., Full Name"
                      />
                      {language === "hi" && field.label && (
                        <button
                          type="button"
                          onClick={() => handleTranslate(field.label, (val) => updateField(index, { label: val }))}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(0%)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 16,
                            opacity: 0.6
                          }}
                          title="Translate to Hindi"
                        >
                          🌐
                        </button>
                      )}
                    </div>
                    <div className="field">
                      <label>Type</label>
                      <select value={field.type || "text"} onChange={(e)=>updateField(index, { type: e.target.value })}>
                        {FIELD_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e)=>updateField(index, { placeholder: e.target.value })}
                        placeholder="Helper text..."
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e)=>updateField(index, { required: e.target.checked })}
                        style={{ width: 16, height: 16 }}
                      />
                      Required field
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(field.fullWidth)}
                        onChange={(e)=>updateField(index, { fullWidth: e.target.checked })}
                        style={{ width: 16, height: 16 }}
                      />
                      Full width
                    </label>
                    {field.type === "select" && (
                      <div className="field" style={{ flex: 1, minWidth: 200 }}>
                        <input
                          type="text"
                          value={Array.isArray(field.options) ? field.options.join(", ") : ""}
                          onChange={(e)=>{
                            const options = e.target.value
                              .split(",")
                              .map(opt => opt.trim())
                              .filter(Boolean);
                            updateField(index, { options });
                          }}
                          placeholder="Options: Option A, Option B, Option C"
                          style={{ fontSize: 13 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {formState.fields.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="icon">📝</div>
                  <p>No fields yet</p>
                  <p className="muted">Add fields manually or import from a document</p>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Tools */}
          <div style={{ marginBottom: 24 }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={()=>setShowAdvanced(v => !v)}
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span>🔧 Advanced Schema Tools</span>
              <span>{showAdvanced ? "▲" : "▼"}</span>
            </button>

            {showAdvanced && (
              <div style={{ 
                marginTop: 16, 
                padding: 20, 
                background: "rgba(0, 245, 255, 0.03)", 
                borderRadius: 16,
                border: "1px solid rgba(0, 245, 255, 0.15)"
              }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>
                    Current Schema Preview
                  </label>
                  <pre className="pre" style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                    {schemaPreview}
                  </pre>
                </div>

                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>
                    Import Custom JSON Schema
                  </label>
                  <textarea
                    rows={5}
                    value={importText}
                    onChange={(e)=>setImportText(e.target.value)}
                    placeholder='{"fields": [{"name": "email", "label": "Email", "type": "email"}]}'
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                  />
                  <div className="actions" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleImportSchema}>
                      Apply Schema
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="divider"></div>

          <div className="actions" style={{ justifyContent: "flex-end" }}>
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancel Editing
              </button>
            )}
            <button className="btn btn-primary btn-lg" type="submit">
              {editingId ? "💾 Update Form" : "✨ Create Form"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Forms List */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 className="section-title" style={{ fontSize: 18, marginBottom: 0 }}>Saved Templates</h3>
          <span className="badge">{forms.length} forms</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {forms.length === 0 && (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>No forms created yet</p>
              <p className="muted">Create your first template to get started</p>
            </div>
          )}
          {forms.map((template)=> (
            <div 
              key={template.id} 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: 16,
                background: editingId === template.id ? "rgba(0, 245, 255, 0.1)" : "rgba(0, 245, 255, 0.03)",
                borderRadius: 14,
                border: editingId === template.id ? "2px solid var(--primary)" : "1px solid var(--border)"
              }}
            >
              <div>
                <strong style={{ fontSize: 15 }}>{template.title}</strong>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {template.description || "No description"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => handleExportResponses(template.id, template.title)}
                  title="Export all responses as CSV"
                >
                  📊 Export
                </button>
                <button className="btn btn-ghost btn-sm" onClick={()=>handleEdit(template)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(template.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
