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
    { id: "clean", label: "Clean Text", icon: "✨", desc: "Refine grammar, spelling, and OCR imperfections" },
    { id: "summarize", label: "Summarize", icon: "📜", desc: "Distill to essential points" },
    { id: "phrases", label: "Extract", icon: "🔑", desc: "Identify key themes" },
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
        setStatus("Text refined successfully");
      }else if(operation === "summarize"){
        res = await fetch(`${API_BASE}/llm/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText, max_length: 75 }),
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.detail || "Summarization failed");
        setResult(data.summary);
        setStatus("Text distilled successfully");
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
      setStatus("Copied to clipboard");
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 340px", gap: 32 }}>
      <div className="card" style={{ position: "relative", overflow: "visible" }}>
        {/* Decorative corner accent */}
        <div style={{
          position: "absolute",
          top: -1,
          right: 40,
          width: 60,
          height: 3,
          background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
          borderRadius: 2
        }} />
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ 
              fontSize: 10, 
              textTransform: "uppercase", 
              letterSpacing: "0.15em", 
              color: "var(--gold)", 
              marginBottom: 6,
              fontWeight: 600 
            }}>Artificial Intelligence</p>
            <h3 className="section-title" style={{ fontSize: 24, marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>Text Processing</h3>
            <p className="muted" style={{ margin: 0, fontStyle: "italic" }}>Refine, distill, and extract insights with elegance</p>
          </div>
          <span className="badge primary" style={{ 
            background: "linear-gradient(135deg, var(--primary-light), var(--gold-light))",
            border: "1px solid var(--gold)",
            color: "var(--primary)",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.05em"
          }}>AI Powered</span>
        </div>

        {error && <div className="error">⚠️ {error}</div>}
        {status && <div className="success">✓ {status}</div>}

        {/* Operation Selector */}
        <div style={{ 
          display: "flex", 
          gap: 14, 
          marginBottom: 28,
          background: "linear-gradient(135deg, var(--bg-subtle), var(--card))",
          padding: 8,
          borderRadius: 14,
          border: "1px solid var(--border)"
        }}>
          {operations.map(op => (
            <button
              key={op.id}
              type="button"
              onClick={() => setOperation(op.id)}
              style={{ 
                flex: 1, 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "18px 16px",
                border: operation === op.id ? "1px solid var(--gold)" : "1px solid transparent",
                borderRadius: 10,
                background: operation === op.id ? "var(--card)" : "transparent",
                boxShadow: operation === op.id ? "var(--shadow-sm)" : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                if(operation !== op.id) {
                  e.currentTarget.style.background = "var(--gold-light)";
                }
              }}
              onMouseLeave={(e) => {
                if(operation !== op.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: 24, filter: operation === op.id ? "none" : "grayscale(0.3)" }}>{op.icon}</span>
              <span style={{ 
                fontWeight: 600, 
                fontSize: 12, 
                color: operation === op.id ? "var(--text-primary)" : "var(--muted)",
                letterSpacing: "0.02em",
                textTransform: "uppercase"
              }}>{op.label}</span>
            </button>
          ))}
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: 24 }}>
          <div className="field">
            <label style={{ fontFamily: "'Playfair Display', Georgia, serif", textTransform: "none", letterSpacing: "0.02em" }}>Input Text</label>
            <textarea
              rows={10}
              value={inputText}
              onChange={(e)=>setInputText(e.target.value)}
              placeholder="Paste your text here — OCR output, transcriptions, or any content requiring refinement..."
              style={{ 
                fontFamily: "'Georgia', serif", 
                fontSize: 14, 
                lineHeight: 1.8,
                background: "linear-gradient(180deg, var(--card) 0%, var(--bg-subtle) 100%)"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <span className="muted" style={{ fontSize: 12, fontStyle: "italic" }}>{inputText.length} characters</span>
              {inputText && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setInputText("")}
                  style={{ padding: "6px 14px", fontSize: 11 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontFamily: "'Playfair Display', Georgia, serif", textTransform: "none", letterSpacing: "0.02em" }}>Result</label>
              {result && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={handleCopy}
                  style={{ padding: "6px 14px", fontSize: 11 }}
                >
                  📋 Copy
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={result}
              readOnly
              placeholder="Your refined result will appear here..."
              style={{ 
                background: "linear-gradient(145deg, var(--bg-subtle) 0%, var(--card) 100%)",
                fontFamily: "'Georgia', serif",
                fontSize: 14,
                lineHeight: 1.8,
                borderStyle: "dashed"
              }}
            />
          </div>
        </div>

        <div className="actions" style={{ justifyContent: "flex-end", marginTop: 28 }}>
          <button 
            className="btn btn-primary btn-lg hover-shine" 
            onClick={handleExecute} 
            disabled={loading || !inputText.trim()}
            style={{ 
              fontFamily: "'Playfair Display', Georgia, serif",
              letterSpacing: "0.08em",
              fontSize: 13
            }}
          >
            {loading ? <><span className="spinner"></span> Processing...</> : `${operations.find(o => o.id === operation)?.icon} Execute ${operations.find(o => o.id === operation)?.label}`}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card" style={{ position: "relative" }}>
          {/* Decorative element */}
          <div style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, var(--gold-light), transparent)",
            borderRadius: "50%",
            opacity: 0.6
          }} />
          
          <h4 style={{ 
            marginTop: 0, 
            fontSize: 16, 
            marginBottom: 20,
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.02em"
          }}>Processing Modes</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {operations.map(op => (
              <div 
                key={op.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: operation === op.id ? "linear-gradient(135deg, var(--gold-light), var(--primary-light))" : "var(--bg-subtle)",
                  border: operation === op.id ? "1px solid var(--gold)" : "1px solid var(--border)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => setOperation(op.id)}
                onMouseEnter={(e) => {
                  if(operation !== op.id) {
                    e.currentTarget.style.borderColor = "var(--gold)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if(operation !== op.id) {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{op.icon}</span>
                  <strong style={{ 
                    fontSize: 14, 
                    fontFamily: "'Playfair Display', Georgia, serif",
                    color: operation === op.id ? "var(--primary)" : "var(--text-primary)"
                  }}>{op.label}</strong>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: 0, fontStyle: "italic" }}>{op.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ 
          background: "linear-gradient(145deg, var(--bg-subtle) 0%, var(--card) 100%)",
          border: "1px solid var(--gold)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative corner */}
          <div style={{
            position: "absolute",
            bottom: -20,
            right: -20,
            width: 80,
            height: 80,
            background: "radial-gradient(circle, var(--gold-light) 0%, transparent 70%)",
            opacity: 0.5
          }} />
          
          <h4 style={{ 
            marginTop: 0, 
            fontSize: 14, 
            color: "var(--gold)",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.05em",
            marginBottom: 14
          }}>💡 Guidance</h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 20, 
            fontSize: 13, 
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.8
          }}>
            <li style={{ marginBottom: 10 }}>Optimized for English prose</li>
            <li style={{ marginBottom: 10 }}>Longer passages yield richer summaries</li>
            <li>Runs efficiently on standard hardware</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
