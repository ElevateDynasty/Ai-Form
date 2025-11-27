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
import OverviewPage from "./pages/OverviewPage";
import ContactPage from "./pages/ContactPage";
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
      gradient: "linear-gradient(135deg, #00f5ff 0%, #0080ff 100%)",
    },
    {
      title: t("voice_filling"),
      description: t("voice_filling_desc"),
      link: "/forms",
      cta: t("start_filling"),
      gradient: "linear-gradient(135deg, #ff00ff 0%, #bf00ff 100%)",
    },
    {
      title: t("smart_export"),
      description: t("smart_export_desc"),
      link: "/forms",
      cta: t("view_forms"),
      gradient: "linear-gradient(135deg, #00ff88 0%, #00f5ff 100%)",
    },
    {
      title: t("text_ai"),
      description: t("text_ai_desc"),
      link: "/llm",
      cta: t("open_ai_tools"),
      gradient: "linear-gradient(135deg, #bf00ff 0%, #ff00ff 100%)",
    },
  ];

  return (
    <div className="dashboard animate-slide-up">
      {/* Hero Section - Neon Theme */}
      <div className="card" style={{ 
        background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a1a2e 100%)", 
        color: "#ffffff",
        marginBottom: 28,
        padding: "40px 36px",
        border: "1px solid rgba(0, 245, 255, 0.2)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative neon accent */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, #00f5ff, #bf00ff, #ff00ff, transparent)"
        }} />
        <p className="eyebrow" style={{ color: "#00f5ff", fontWeight: 600, letterSpacing: "0.15em" }}>{t("app_name")}</p>
        <h2 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 14px", letterSpacing: "-0.5px", fontFamily: "'Orbitron', sans-serif", background: "linear-gradient(135deg, #00f5ff, #bf00ff, #ff00ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {t("welcome_title")}
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.7)", maxWidth: 600, marginBottom: 28, lineHeight: 1.7, fontSize: 15 }}>
          {t("welcome_subtitle")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className="btn"
              style={{
                background: "rgba(0, 245, 255, 0.1)",
                backdropFilter: "blur(10px)",
                color: "#ffffff",
                border: "1px solid rgba(0, 245, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 245, 255, 0.2)";
                e.currentTarget.style.borderColor = "#00f5ff";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 245, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 245, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.3)";
                e.currentTarget.style.boxShadow = "none";
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
        <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18, color: "var(--text-secondary)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.02em" }}>{t("how_it_works")}</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {workflow.map((step, idx)=>(
            <div key={step.title} className="card" style={{ padding: 22, textAlign: "center", border: "1px solid var(--border)", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--neon-cyan)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 245, 255, 0.2)";
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
                background: "linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(191, 0, 255, 0.2) 100%)",
                border: "1px solid rgba(0, 245, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 12px"
              }}>
                {step.icon}
              </div>
              <span className="badge primary" style={{ marginBottom: 8 }}>{idx + 1}</span>
              <h4 style={{ margin: "8px 0 6px", fontSize: 15, fontFamily: "'Orbitron', sans-serif" }}>{step.title}</h4>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {highlights.map(card => (
          <div key={card.title} className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", transition: "all 0.3s ease" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.5)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 245, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ 
              background: card.gradient, 
              padding: "22px 26px",
              color: "#000"
            }}>
              <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.02em" }}>{card.title}</h4>
            </div>
            <div style={{ padding: 26 }}>
              <p className="muted" style={{ marginBottom: 18, minHeight: 44, lineHeight: 1.6 }}>{card.description}</p>
              <Link to={card.link} className="btn btn-secondary" style={{ padding: "10px 18px" }}>
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
              <Route path="overview" element={<OverviewPage />} />
              <Route path="contact" element={<ContactPage />} />
            </Route>
            <Route path="/auth" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
