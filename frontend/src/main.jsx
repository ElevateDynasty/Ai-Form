import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import App from "./App";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login";
import OCRPage from "./pages/OCRPage";
import AudioPage from "./pages/AudioPage";
import FormsPage from "./pages/FormsPage";
import AdminFormsPage from "./pages/AdminFormsPage";
import PdfFillPage from "./pages/PdfFillPage";
import LLMPage from "./pages/LLMPage";
import RequireAuth from "./RequireAuth";

function Dashboard(){
  const { role } = useAuth();

  const quickActions = [
    { label: "Scan Documents", to: "/ocr", helper: "PDF & image OCR", icon: "📄" },
    { label: "Voice Input", to: "/audio", helper: "Speech to text", icon: "🎤" },
    { label: "Fill Forms", to: "/forms", helper: "Smart autofill", icon: "📝" },
    { label: "PDF Templates", to: "/pdf-fill", helper: "Merge & export", icon: "📑" },
    { label: "Text AI", to: "/llm", helper: "Clean & summarize", icon: "✨" },
  ];
  if(role === "admin"){
    quickActions.push({ label: "Manage Forms", to: "/forms/manage", helper: "Visual builder", icon: "⚙️" });
  }

  const workflow = [
    { title: "Ingest", detail: "Upload documents or start from templates. Our OCR extracts key data automatically.", icon: "📥" },
    { title: "Enrich", detail: "Add voice input, merge OCR results, and validate entries with smart hints.", icon: "🔧" },
    { title: "Validate", detail: "Review normalized data, check required fields, and fix any issues.", icon: "✅" },
    { title: "Export", detail: "Download as JSON, generate PDFs, or share directly from the platform.", icon: "📤" },
  ];

  const highlights = [
    {
      title: "Document → Form",
      description: "Upload any PDF or image and let AI draft the form structure automatically.",
      link: "/forms/manage",
      cta: "Try it now",
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    },
    {
      title: "Voice Filling",
      description: "Speak naturally to fill forms. Say 'Set email to john@example.com' and watch the magic.",
      link: "/forms",
      cta: "Start filling",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      title: "Smart Export",
      description: "Every submission can be downloaded as JSON or a professionally formatted PDF.",
      link: "/forms",
      cta: "View forms",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
    {
      title: "Text AI",
      description: "Clean up messy OCR text, summarize long documents, or extract key phrases.",
      link: "/llm",
      cta: "Open AI tools",
      gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    },
  ];

  return (
    <div className="dashboard animate-slide-up">
      {/* Hero Section */}
      <div className="card" style={{ 
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)", 
        color: "white",
        marginBottom: 28,
        padding: "36px 32px"
      }}>
        <p className="eyebrow" style={{ color: "rgba(255,255,255,0.8)" }}>Welcome to AI Forms</p>
        <h2 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-0.5px" }}>
          Your intelligent form management hub
        </h2>
        <p style={{ opacity: 0.9, maxWidth: 600, marginBottom: 24, lineHeight: 1.6 }}>
          Convert documents to forms with OCR, fill them using voice commands, and export 
          professional PDFs — all from one unified platform.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className="btn"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
              }}
            >
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <div style={{ textAlign: "left" }}>
                <span style={{ fontWeight: 600, display: "block" }}>{action.label}</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>{action.helper}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Workflow Steps */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)" }}>How it works</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {workflow.map((step, idx)=>(
            <div key={step.title} className="card" style={{ padding: 20, textAlign: "center" }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 14, 
                background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 12px"
              }}>
                {step.icon}
              </div>
              <span className="badge" style={{ marginBottom: 8 }}>Step {idx + 1}</span>
              <h4 style={{ margin: "8px 0 6px", fontSize: 15 }}>{step.title}</h4>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {highlights.map(card => (
          <div key={card.title} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ 
              background: card.gradient, 
              padding: "20px 24px",
              color: "white"
            }}>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{card.title}</h4>
            </div>
            <div style={{ padding: 24 }}>
              <p className="muted" style={{ marginBottom: 16, minHeight: 44 }}>{card.description}</p>
              <Link to={card.link} className="btn btn-ghost" style={{ padding: "10px 18px" }}>
                {card.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RequireAuth><App /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="ocr" element={<OCRPage />} />
            <Route path="audio" element={<AudioPage />} />
            <Route path="forms" element={<FormsPage />} />
            <Route path="forms/manage" element={<AdminFormsPage />} />
            <Route path="pdf-fill" element={<PdfFillPage />} />
            <Route path="llm" element={<LLMPage />} />
          </Route>
          <Route path="/auth" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
