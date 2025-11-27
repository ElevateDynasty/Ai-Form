import React, { useState } from "react";
import { API_BASE } from "../config";
import { useAuth } from "../AuthContext";

const SAMPLE_JSON = `{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "address": "221B Baker Street",
  "date_of_birth": "1990-01-01"
}`;

export default function PdfFillPage(){
  const { token } = useAuth();
  const [pdfFile, setPdfFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePdfChange = (event)=>{
    const file = event.target.files && event.target.files[0];
    setPdfFile(file || null);
  };

  const handleJsonFileChange = (event)=>{
    const file = event.target.files && event.target.files[0];
    if(!file){
      setJsonFile(null);
      return;
    }
    setJsonFile(file);
    setError("");
    setStatus(`Using ${file.name} as field values`);
    event.target.value = "";
  };

  const handleSubmit = async (event)=>{
    event.preventDefault();
    setStatus("");
    setError("");
    if(!pdfFile){
      setError("Select a fillable PDF first");
      return;
    }
    setLoading(true);
    try{
      const formData = new FormData();
      formData.append("file", pdfFile);

      if(jsonFile){
        formData.append("field_values", jsonFile);
      }else{
        let parsed;
        try{
          parsed = JSON.parse(jsonText || "{}");
        }catch(err){
          throw new Error("JSON payload is not valid");
        }
        formData.append(
          "field_values",
          new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" }),
          "field_values.json"
        );
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/pdf/fill`, {
        method: "POST",
        headers,
        body: formData,
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({ detail: "Unable to fill PDF" }));
        throw new Error(err.detail || "Unable to fill PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFile ? `filled-${pdfFile.name}` : "filled_form.pdf";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Filled PDF downloaded successfully!");
    }catch(err){
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 24 }}>
      <div className="card">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{
              width:48, height:48, borderRadius:14, 
              background:"linear-gradient(135deg, #ff00ff, #bf00ff)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24,
              boxShadow:"0 8px 24px rgba(255,0,255,0.3)"
            }}>
              📑
            </div>
            <div>
              <h3 className="section-title" style={{fontSize:20, margin:0}}>PDF Auto-Fill</h3>
              <p className="muted" style={{fontSize:12, margin:0}}>Merge data with templates</p>
            </div>
          </div>
          <span className="badge primary">Beta</span>
        </div>
        
        <div style={{
          background:"linear-gradient(135deg, rgba(255, 0, 255, 0.06), rgba(0, 245, 255, 0.04))",
          borderRadius:14, padding:16, marginBottom:24,
          border:"1px solid rgba(255, 0, 255, 0.15)"
        }}>
          <p className="muted" style={{ margin:0, lineHeight: 1.7, fontSize:13 }}>
            📄 Upload any PDF with form fields (AcroForm). Pair it with JSON values from the Forms workspace or paste data below, then download a ready-to-share copy instantly.
          </p>
        </div>
        
        {error && <div className="error" style={{marginBottom:16}}>⚠️ {error}</div>}
        {status && <div className="success" style={{marginBottom:16}}>✅ {status}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Step 1: PDF Upload */}
          <div style={{marginBottom:28}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
              <span style={{
                width:28, height:28, borderRadius:8, 
                background:"var(--primary)", color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700
              }}>1</span>
              <label style={{fontWeight:600, fontSize:15}}>Upload PDF Template</label>
            </div>
            <label className={`file-drop-zone ${pdfFile ? 'active' : ''}`} style={{padding:28}}>
              <input type="file" accept="application/pdf" onChange={handlePdfChange} />
              {pdfFile ? (
                <>
                  <span style={{fontSize:40}}>📄</span>
                  <span style={{fontWeight:700, color:'var(--primary)', fontSize:16}}>{pdfFile.name}</span>
                  <span style={{fontSize:12, color:"var(--muted)"}}>Click to replace file</span>
                </>
              ) : (
                <>
                  <span style={{fontSize:40, opacity:0.4}}>📂</span>
                  <span style={{fontWeight:600, fontSize:15}}>Drop PDF here or click to upload</span>
                  <span style={{fontSize:12, color:"var(--muted)"}}>Must be a fillable AcroForm PDF</span>
                </>
              )}
            </label>
          </div>

          {/* Step 2: Field Values */}
          <div style={{marginBottom:28}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
              <span style={{
                width:28, height:28, borderRadius:8, 
                background:"var(--primary)", color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700
              }}>2</span>
              <label style={{fontWeight:600, fontSize:15}}>Provide Field Values</label>
            </div>
            
            <div style={{display:'flex', gap:8, marginBottom:16, background:'rgba(0, 245, 255, 0.03)', padding:6, borderRadius:14, border:'1px solid rgba(0, 245, 255, 0.1)'}}>
              <button 
                type="button" 
                className={`btn ${!jsonFile ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setJsonFile(null)}
                style={{fontSize:13, padding:'10px 18px', flex:1}}
              >
                ✏️ Text Editor
              </button>
              <label className={`btn ${jsonFile ? 'btn-primary' : 'btn-ghost'}`} style={{cursor:'pointer', fontSize:13, padding:'10px 18px', margin:0, flex:1, textAlign:"center"}}>
                📁 Upload JSON
                <input type="file" accept="application/json" style={{display:'none'}} onChange={handleJsonFileChange} />
              </label>
            </div>
            
            {jsonFile ? (
              <div className="file-drop-zone active" style={{padding:28, borderStyle:'solid'}}>
                <span style={{fontSize:40}}>📋</span>
                <span style={{fontWeight:700, color:'var(--primary)', fontSize:16}}>{jsonFile.name}</span>
                <span style={{fontSize:12, color:"var(--muted)"}}>Ready to merge with PDF</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:12}} onClick={()=>setJsonFile(null)}>
                  ✕ Remove File
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  rows={10}
                  value={jsonText}
                  onChange={(e)=>setJsonText(e.target.value)}
                  placeholder='{\n  "field_name": "value"\n}'
                  style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
                />
                <p className="muted" style={{fontSize:11, marginTop:8, textAlign:"right"}}>
                  Use field names that match your PDF form fields
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:20 }}>
            <button 
              className="btn btn-primary btn-lg" 
              type="submit" 
              disabled={loading || !pdfFile}
              style={{width:"100%", justifyContent:"center"}}
            >
              {loading ? (
                <><span className="spinner"></span> Processing PDF...</>
              ) : (
                "📥 Generate & Download Filled PDF"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card">
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:16}}>
            <span style={{fontSize:24}}>📖</span>
            <h4 style={{ margin:0, fontSize:16 }}>How it works</h4>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { step: "1", title: "Prepare Data", desc: "Save a response in Forms and download its JSON, or write it manually." },
              { step: "2", title: "Get Template", desc: "Use a PDF with form fields (Acrobat/LibreOffice export)." },
              { step: "3", title: "Merge & Download", desc: "Upload both and get filled PDF instantly." }
            ].map(item => (
              <div key={item.step} style={{display:"flex", gap:12}}>
                <span style={{
                  width:24, height:24, borderRadius:6, flexShrink:0,
                  background:"linear-gradient(135deg, var(--primary), var(--accent))",
                  color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700
                }}>{item.step}</span>
                <div>
                  <strong style={{fontSize:13, display:"block", marginBottom:2}}>{item.title}</strong>
                  <span style={{fontSize:12, color:'var(--muted)', lineHeight:1.5}}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card" style={{
          background:'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)',
          border:"1px solid rgba(0, 245, 255, 0.2)"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
            <span style={{fontSize:20}}>💡</span>
            <h4 style={{ margin:0, fontSize:15, color:'#00f5ff' }}>Pro Tip</h4>
          </div>
          <p className="muted" style={{fontSize:13, margin:0, lineHeight:1.6}}>
            Scanned PDFs are just images. You must convert them to <strong style={{color:"var(--text-primary)"}}>fillable forms</strong> first using our OCR tab or external tools like Adobe Acrobat.
          </p>
        </div>

        <div className="card" style={{
          background:'linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 245, 255, 0.05) 100%)',
          border:"1px solid rgba(0, 255, 136, 0.2)"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
            <span style={{fontSize:20}}>⚡</span>
            <h4 style={{ margin:0, fontSize:15, color:'#00ff88' }}>Quick Start</h4>
          </div>
          <p className="muted" style={{fontSize:13, margin:0, lineHeight:1.6}}>
            Try with the sample JSON provided! Just upload any fillable PDF and hit generate.
          </p>
        </div>
      </div>
    </div>
  );
}
