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
      gradient: "linear-gradient(135deg, #b8956e 0%, #8b7355 100%)",
    },
    {
      title: t("voice_filling"),
      description: t("voice_filling_desc"),
      link: "/forms",
      cta: t("start_filling"),
      gradient: "linear-gradient(135deg, #6d5a43 0%, #4a3f2f 100%)",
    },
    {
      title: t("smart_export"),
      description: t("smart_export_desc"),
      link: "/forms",
      cta: t("view_forms"),
      gradient: "linear-gradient(135deg, #c4a97d 0%, #a08050 100%)",
    },
    {
      title: t("text_ai"),
      description: t("text_ai_desc"),
      link: "/llm",
      cta: t("open_ai_tools"),
      gradient: "linear-gradient(135deg, #8b7355 0%, #6d5a43 100%)",
    },
  ];

  return (
    <div className="dashboard animate-slide-up">
      {/* Hero Section - Old Money Theme */}
      <div className="card" style={{ 
        background: "linear-gradient(135deg, #1a1612 0%, #2d2620 50%, #3d3429 100%)", 
        color: "#faf9f7",
        marginBottom: 28,
        padding: "40px 36px",
        border: "1px solid rgba(184, 149, 110, 0.3)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative gold accent */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, #b8956e, #c4a97d, #b8956e, transparent)"
        }} />
        <p className="eyebrow" style={{ color: "#c4a97d", fontWeight: 600, letterSpacing: "0.15em" }}>{t("app_name")}</p>
        <h2 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 14px", letterSpacing: "-0.5px", fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t("welcome_title")}
        </h2>
        <p style={{ opacity: 0.85, maxWidth: 600, marginBottom: 28, lineHeight: 1.7, fontStyle: "italic" }}>
          {t("welcome_subtitle")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className="btn"
              style={{
                background: "rgba(184, 149, 110, 0.15)",
                backdropFilter: "blur(10px)",
                color: "#faf9f7",
                border: "1px solid rgba(184, 149, 110, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(184, 149, 110, 0.3)";
                e.currentTarget.style.borderColor = "#b8956e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(184, 149, 110, 0.15)";
                e.currentTarget.style.borderColor = "rgba(184, 149, 110, 0.4)";
              }}
            >
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <div style={{ textAlign: "left" }}>
                <span style={{ fontWeight: 600, display: "block" }}>{action.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{action.helper}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Workflow Steps */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18, color: "var(--text-secondary)", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "0.02em" }}>{t("how_it_works")}</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {workflow.map((step, idx)=>(
            <div key={step.title} className="card" style={{ padding: 22, textAlign: "center", border: "1px solid var(--border)", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(184, 149, 110, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow)";
              }}
            >
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 14, 
                background: "linear-gradient(135deg, var(--gold-light) 0%, var(--primary-light) 100%)",
                border: "1px solid var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 12px"
              }}>
                {step.icon}
              </div>
              <span className="badge" style={{ marginBottom: 8, background: "var(--gold-light)", color: "var(--primary)", border: "1px solid var(--gold)" }}>{idx + 1}</span>
              <h4 style={{ margin: "8px 0 6px", fontSize: 15, fontFamily: "'Playfair Display', Georgia, serif" }}>{step.title}</h4>
              <p className="muted" style={{ fontSize: 13, margin: 0, fontStyle: "italic" }}>{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {highlights.map(card => (
          <div key={card.title} className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", transition: "all 0.3s ease" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ 
              background: card.gradient, 
              padding: "22px 26px",
              color: "#faf9f7"
            }}>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "0.02em" }}>{card.title}</h4>
            </div>
            <div style={{ padding: 26 }}>
              <p className="muted" style={{ marginBottom: 18, minHeight: 44, fontStyle: "italic", lineHeight: 1.6 }}>{card.description}</p>
              <Link to={card.link} className="btn btn-ghost" style={{ padding: "10px 18px", borderColor: "var(--gold)", color: "var(--primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gold-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
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
