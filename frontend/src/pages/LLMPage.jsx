import React, { useState } from "react";
import { API_BASE } from "../config";

export default function LLMPage(){
  const [inputText, setInputText] = useState("");
  const [operation, setOperation] = useState("clean");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const operations = [
    { id: "clean", label: "Clean Text", icon: "✨", desc: "Fix grammar, spelling, and OCR errors" },
    { id: "summarize", label: "Summarize", icon: "📝", desc: "Condense to key points" },
    { id: "phrases", label: "Extract", icon: "🔑", desc: "Identify main topics" },
  ];

  const handleExecute = async ()=>{
    setStatus("");
    setError("");
    setResult("");
    if(!inputText.trim()){
      setError("Please enter some text first");
      return;
    }
    setLoading(true);
    try{
      let res;
      if(operation === "clean"){
        res = await fetch(`${API_BASE}/llm/clean`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText }),
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.detail || "Cleaning failed");
        setResult(data.cleaned);
        setStatus("Text cleaned successfully");
      }else if(operation === "summarize"){
        res = await fetch(`${API_BASE}/llm/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText, max_length: 75 }),
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.detail || "Summarization failed");
        setResult(data.summary);
        setStatus("Text summarized successfully");
      }else if(operation === "phrases"){
        const url = new URL(`${API_BASE}/llm/phrases`);
        url.searchParams.set("text", inputText);
        url.searchParams.set("num_phrases", "5");
        res = await fetch(url.toString());
        const data = await res.json();
        if(!res.ok) throw new Error(data.detail || "Extraction failed");
        setResult(data.phrases.join(", "));
        setStatus("Key phrases extracted");
      }
    }catch(err){
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCopy = ()=>{
    if(result){
      navigator.clipboard.writeText(result);
      setStatus("Copied to clipboard!");
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 320px", gap: 24 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h3 className="section-title" style={{ fontSize: 20, marginBottom: 4 }}>Text AI Processing</h3>
            <p className="muted" style={{ margin: 0 }}>Clean, summarize, or extract insights from text</p>
          </div>
          <span className="badge primary">AI Powered</span>
        </div>

        {error && <div className="error">⚠️ {error}</div>}
        {status && <div className="success">✅ {status}</div>}

        {/* Operation Selector */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginBottom: 24,
          background: "rgba(15,23,42,0.02)",
          padding: 6,
          borderRadius: 16
        }}>
          {operations.map(op => (
            <button
              key={op.id}
              type="button"
              className={`btn ${operation === op.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setOperation(op.id)}
              style={{ 
                flex: 1, 
                flexDirection: "column", 
                gap: 4,
                padding: "14px 12px"
              }}
            >
              <span style={{ fontSize: 20 }}>{op.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{op.label}</span>
            </button>
          ))}
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
          <div className="field">
            <label>Input Text</label>
            <textarea
              rows={10}
              value={inputText}
              onChange={(e)=>setInputText(e.target.value)}
              placeholder="Paste messy OCR output, voice transcription, or any text you want to process..."
              style={{ fontFamily: "'SF Mono', Monaco, monospace", fontSize: 13, lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>{inputText.length} characters</span>
              {inputText && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setInputText("")}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Output</label>
              {result && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={handleCopy}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  📋 Copy
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={result}
              readOnly
              placeholder="Processed result will appear here..."
              style={{ 
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                fontFamily: "'SF Mono', Monaco, monospace",
                fontSize: 13,
                lineHeight: 1.6
              }}
            />
          </div>
        </div>

        <div className="actions" style={{ justifyContent: "flex-end", marginTop: 24 }}>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleExecute} 
            disabled={loading || !inputText.trim()}
          >
            {loading ? <><span className="spinner"></span> Processing...</> : `${operations.find(o => o.id === operation)?.icon} Run ${operations.find(o => o.id === operation)?.label}`}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card">
          <h4 style={{ marginTop: 0, fontSize: 15, marginBottom: 16 }}>What each mode does</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {operations.map(op => (
              <div 
                key={op.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: operation === op.id ? "rgba(99,102,241,0.06)" : "transparent",
                  border: operation === op.id ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span>{op.icon}</span>
                  <strong style={{ fontSize: 14 }}>{op.label}</strong>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>{op.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ 
          background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
          border: "1px solid rgba(99,102,241,0.15)"
        }}>
          <h4 style={{ marginTop: 0, fontSize: 14, color: "var(--primary)" }}>💡 Pro Tips</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)" }}>
            <li style={{ marginBottom: 8 }}>Works best with English text</li>
            <li style={{ marginBottom: 8 }}>Longer text = better summaries</li>
            <li>Results run on CPU (no GPU needed)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
