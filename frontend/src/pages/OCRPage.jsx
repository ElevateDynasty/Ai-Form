import React, { useState } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../AuthContext';

export default function OCRPage(){
  const { setExtractedFields } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({});
  const [rawText, setRawText] = useState('');
  const [meta, setMeta] = useState({ filename: '' });
  const [error, setError] = useState('');

  const handle = async ()=>{
    if(!file){ setError('Please select a file first'); return; }
    setError(''); setLoading(true);
    try{
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_BASE}/ocr/extract`, { method:'POST', body:fd });
      if(!res.ok){
        const msg = await res.json().catch(()=>({ detail: 'OCR processing failed' }));
        throw new Error(msg.detail || 'OCR processing failed');
      }
      const data = await res.json();
      setResult(data.fields||{});
      setRawText(data.raw_text || '');
      setMeta({ filename: data.filename });
      setExtractedFields(data.fields||{});
    }catch(e){ setError(e.message); }
    setLoading(false);
  };

  const fieldCount = Object.keys(result).length;

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 className="section-title" style={{ fontSize: 20, marginBottom: 4 }}>Document Scanner</h3>
            <p className="muted" style={{ margin: 0 }}>Extract structured data from PDFs, IDs, and documents</p>
          </div>
          <span className="badge primary">OCR</span>
        </div>

        {error && <div className="error">⚠️ {error}</div>}

        <label className={`file-drop-zone ${file ? 'active' : ''}`} style={{ marginBottom: 20 }}>
          <input type="file" accept=".pdf,image/*" onChange={(e)=>setFile(e.target.files[0])} />
          {file ? (
            <>
              <span style={{ fontSize: 48 }}>📄</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{file.name}</span>
              <span style={{ fontSize: 13 }}>Click to choose a different file</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 48, opacity: 0.4 }}>📂</span>
              <span style={{ fontWeight: 600 }}>Drop your document here</span>
              <span style={{ fontSize: 13 }}>Supports PDF, PNG, JPG, and other image formats</span>
            </>
          )}
        </label>

        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-primary btn-lg" onClick={handle} disabled={loading || !file}>
            {loading ? <><span className="spinner"></span> Processing...</> : 'Extract Data'}
          </button>
          {meta.filename && <span className="badge success">✓ {meta.filename}</span>}
        </div>

        <div className="divider"></div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Extracted Fields</h4>
            {fieldCount > 0 && <span className="badge success">{fieldCount} fields found</span>}
          </div>
          <pre className="pre" style={{ minHeight: 180, maxHeight: 320 }}>
            {fieldCount > 0 ? JSON.stringify(result, null, 2) : 'No data extracted yet. Upload a document to begin.'}
          </pre>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="section-title" style={{ fontSize: 18, marginBottom: 0 }}>Raw Text Output</h3>
          {rawText && <span className="badge">{rawText.split(' ').length} words</span>}
        </div>
        <p className="muted">Review the full OCR output to verify accuracy or find additional information.</p>
        <div className="pre" style={{ height: 340, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {rawText || 'The raw text will appear here after processing...'}
        </div>

        {rawText && (
          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigator.clipboard.writeText(rawText)}
            >
              📋 Copy Text
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
