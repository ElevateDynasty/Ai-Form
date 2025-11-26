import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import App from "./App";
import { AuthProvider, useAuth } from "./AuthContext";
import { LanguageProvider, useLanguage } from "./LanguageContext";
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
  const { t } = useLanguage();

  const quickActions = [
    { label: t("scan_docs"), to: "/ocr", helper: t("scan_docs_desc"), icon: "📄" },
    { label: t("voice_input"), to: "/audio", helper: t("voice_input_desc"), icon: "🎤" },
    { label: t("fill_forms"), to: "/forms", helper: t("fill_forms_desc"), icon: "📝" },
    { label: t("pdf_templates"), to: "/pdf-fill", helper: t("pdf_templates_desc"), icon: "📑" },
    { label: t("text_ai"), to: "/llm", helper: t("text_ai_desc"), icon: "✨" },
  ];
  if(role === "admin"){
    quickActions.push({ label: t("manage_forms"), to: "/forms/manage", helper: t("manage_forms_desc"), icon: "⚙️" });
  }

  const workflow = [
    { title: t("step_ingest"), detail: t("step_ingest_desc"), icon: "📥" },
    { title: t("step_enrich"), detail: t("step_enrich_desc"), icon: "🔧" },
    { title: t("step_validate"), detail: t("step_validate_desc"), icon: "✅" },
    { title: t("step_export"), detail: t("step_export_desc"), icon: "📤" },
  ];

  const highlights = [
    {
      title: t("doc_to_form"),
      description: t("doc_to_form_desc"),
      link: "/forms/manage",
      cta: t("try_now"),
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    },
    {
      title: t("voice_filling"),
      description: t("voice_filling_desc"),
      link: "/forms",
      cta: t("start_filling"),
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      title: t("smart_export"),
      description: t("smart_export_desc"),
      link: "/forms",
      cta: t("view_forms"),
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
    {
      title: t("text_ai"),
      description: t("text_ai_desc"),
      link: "/llm",
      cta: t("open_ai_tools"),
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
        <p className="eyebrow" style={{ color: "rgba(255,255,255,0.8)" }}>{t("app_name")}</p>
        <h2 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 12px", letterSpacing: "-0.5px" }}>
          {t("welcome_title")}
        </h2>
        <p style={{ opacity: 0.9, maxWidth: 600, marginBottom: 24, lineHeight: 1.6 }}>
          {t("welcome_subtitle")}
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
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)" }}>{t("how_it_works")}</h3>
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
              <span className="badge" style={{ marginBottom: 8 }}>{idx + 1}</span>
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
    <LanguageProvider>
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
    </LanguageProvider>
  </React.StrictMode>
);
