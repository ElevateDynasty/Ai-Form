import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthContext";
import { useLanguage, LANGUAGES } from "./LanguageContext";

export default function App(){
  const {
    role,
    logout,
    voiceNavListening,
    setVoiceNavListening,
    voiceNavStatus,
    setVoiceNavStatus,
  } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [accessibilityMode, setAccessibilityMode] = useState(()=>{
    if(typeof window === "undefined") return false;
    return window.localStorage?.getItem("accessibilityMode") === "on";
  });
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(()=>{
    if(accessibilityMode){
      document.body.classList.add("accessibility-mode");
      window.localStorage?.setItem("accessibilityMode", "on");
    }else{
      document.body.classList.remove("accessibility-mode");
      window.localStorage?.setItem("accessibilityMode", "off");
    }
  }, [accessibilityMode]);
  const voiceNavRecognitionRef = useRef(null);

  useEffect(()=>{
    return ()=>{
      voiceNavRecognitionRef.current?.stop();
    };
  }, []);

  const commandHandlers = useMemo(()=>[
    { pattern: /(go|open).*(dashboard)/i, action: ()=>navigate("/") },
    { pattern: /(go|open).*(ocr|scanner)/i, action: ()=>navigate("/ocr") },
    { pattern: /(go|open).*(voice|audio)/i, action: ()=>navigate("/audio") },
    { pattern: /(go|open).*(form|forms)/i, action: ()=>navigate("/forms") },
    { pattern: /(go|open).*(pdf)/i, action: ()=>navigate("/pdf-fill") },
    { pattern: /(go|open).*(manage)/i, action: ()=> role === "admin" && navigate("/forms/manage") },
    { pattern: /(start|run).*(ocr upload|document upload)/i, action: ()=>navigate("/ocr") },
  ], [navigate, role]);

  const handleVoiceCommand = (spoken)=>{
    const text = (spoken || "").trim();
    if(!text){ return; }
    for(const handler of commandHandlers){
      if(handler.pattern.test(text)){
        handler.action?.();
        setVoiceNavStatus(`Navigating → ${text}`);
        return true;
      }
    }
    setVoiceNavStatus(`No match for "${text}"`);
    return false;
  };

  const toggleVoiceNav = ()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      setVoiceNavStatus("Voice navigation unavailable in this browser");
      return;
    }
    if(voiceNavListening){
      voiceNavRecognitionRef.current?.stop();
      setVoiceNavListening(false);
      setVoiceNavStatus("Voice navigation paused");
      return;
    }
    const recognition = new SpeechRecognition();
    voiceNavRecognitionRef.current = recognition;
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = ()=>{
      setVoiceNavListening(true);
      setVoiceNavStatus("Listening for commands…");
    };
    recognition.onerror = (event)=>{
      setVoiceNavListening(false);
      setVoiceNavStatus(event.error === "not-allowed" ? "Microphone permission denied" : "Voice navigation error");
    };
    recognition.onend = ()=>{
      setVoiceNavListening(false);
      setVoiceNavStatus("Voice navigation idle");
      voiceNavRecognitionRef.current = null;
    };
    recognition.onresult = (event)=>{
      for(let i = event.resultIndex; i < event.results.length; i++){
        if(event.results[i].isFinal){
          const transcript = event.results[i][0].transcript;
          handleVoiceCommand(transcript);
        }
      }
    };
    recognition.start();
  };

  const links = useMemo(()=>{
    const base = [
      { to: "/", label: t("nav_home"), icon: "🏠" },
      { to: "/overview", label: t("nav_overview") || "Overview", icon: "ℹ️" },
      { to: "/ocr", label: t("nav_ocr"), icon: "📄" },
      { to: "/audio", label: t("nav_voice"), icon: "🎤" },
      { to: "/forms", label: t("nav_forms"), icon: "📝" },
      { to: "/pdf-fill", label: t("nav_pdf"), icon: "📑" },
      { to: "/llm", label: t("nav_ai"), icon: "✨" },
      { to: "/contact", label: t("nav_contact") || "Contact", icon: "📧" },
    ];
    if(role === "admin"){
      base.push({ to: "/forms/manage", label: t("nav_manage"), icon: "⚙️" });
    }
    return base;
  }, [role, t]);

  // Get current language info
  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <p className="eyebrow">{t("app_name")}</p>
            <h1 className="title">{t("app_tagline")}</h1>
          </div>
        </div>

        <nav className="nav-links">
          {links.map((link)=> (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Language Selector */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowLangMenu(!showLangMenu)}
              style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70 }}
              title={t("select_language")}
            >
              <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
              <span style={{ fontSize: 12 }}>{currentLang.code.toUpperCase()}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
            </button>
            
            {showLangMenu && (
              <>
                <div 
                  style={{ 
                    position: "fixed", 
                    inset: 0, 
                    zIndex: 99 
                  }} 
                  onClick={() => setShowLangMenu(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    zIndex: 100,
                    minWidth: 160,
                    maxHeight: 320,
                    overflowY: "auto",
                    padding: 8,
                    transformOrigin: "top right"
                  }}
                >
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 12px",
                        border: "none",
                        background: language === lang.code ? "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)" : "transparent",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        textAlign: "left",
                        transition: "background 0.08s ease"
                      }}
                      onMouseEnter={e => {
                        if(language !== lang.code) e.target.style.background = "rgba(0,0,0,0.04)";
                      }}
                      onMouseLeave={e => {
                        if(language !== lang.code) e.target.style.background = "transparent";
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{lang.flag}</span>
                      <span style={{ 
                        fontWeight: language === lang.code ? 600 : 400,
                        color: language === lang.code ? "var(--primary)" : "inherit"
                      }}>{lang.label}</span>
                      {language === lang.code && (
                        <span style={{ marginLeft: "auto", color: "var(--primary)" }}>✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={()=>setAccessibilityMode(value => !value)}
            aria-pressed={accessibilityMode}
            title={accessibilityMode ? "Switch to standard view" : "Switch to high contrast"}
          >
            {accessibilityMode ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${voiceNavListening ? 'btn-danger' : 'btn-ghost'}`}
            onClick={toggleVoiceNav}
            aria-pressed={voiceNavListening}
            title={voiceNavListening ? "Stop voice navigation" : "Start voice navigation"}
          >
            {voiceNavListening ? "🎤 Stop" : "🎤"}
          </button>
          <div style={{
            display:"flex",
            alignItems:"center",
            gap:8,
            padding:"8px 14px",
            background:"#ffffff",
            borderRadius:12,
            border:"1px solid var(--border)"
          }}>
            <div style={{
              width:32,
              height:32,
              borderRadius:10,
              background:"linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              color:"white",
              fontSize:14,
              fontWeight:600
            }}>
              {(role || "U")[0].toUpperCase()}
            </div>
            <div>
              <p style={{margin:0,fontSize:12,color:"var(--muted)"}}>{t("logged_in_as")}</p>
              <p style={{margin:0,fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{role ?? "User"}</p>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={logout} 
              title={t("logout")} 
              style={{
                marginLeft:8,
                background:"rgba(139,115,85,0.1)",
                border:"1px solid var(--gold)",
                color:"var(--primary)",
                padding:"6px 12px"
              }}
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main" id="main-content">
        {voiceNavStatus && voiceNavStatus !== "Voice navigation idle" && (
          <div className="animate-slide-up" style={{
            background: voiceNavListening ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(15,23,42,0.03)",
            color: voiceNavListening ? "white" : "var(--text-secondary)",
            padding: "10px 16px",
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            {voiceNavListening && <span className="animate-pulse">●</span>}
            {voiceNavStatus}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.section
            key={location.pathname}
            className="page-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ 
              duration: 0.12, 
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <Outlet />
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
