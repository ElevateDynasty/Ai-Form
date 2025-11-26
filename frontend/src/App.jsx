import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthContext";

export default function App(){
  const {
    role,
    logout,
    voiceNavListening,
    setVoiceNavListening,
    voiceNavStatus,
    setVoiceNavStatus,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accessibilityMode, setAccessibilityMode] = useState(()=>{
    if(typeof window === "undefined") return false;
    return window.localStorage?.getItem("accessibilityMode") === "on";
  });

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
    recognition.lang = "en";
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
      { to: "/", label: "Home", icon: "🏠" },
      { to: "/ocr", label: "OCR", icon: "📄" },
      { to: "/audio", label: "Voice", icon: "🎤" },
      { to: "/forms", label: "Forms", icon: "📝" },
      { to: "/pdf-fill", label: "PDF", icon: "📑" },
      { to: "/llm", label: "AI", icon: "✨" },
    ];
    if(role === "admin"){
      base.push({ to: "/forms/manage", label: "Manage", icon: "⚙️" });
    }
    return base;
  }, [role]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <p className="eyebrow">AI Forms</p>
            <h1 className="title">Smart Form Platform</h1>
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
            gap:10,
            padding:"8px 14px",
            background:"rgba(15,23,42,0.03)",
            borderRadius:12
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
              <p style={{margin:0,fontSize:12,color:"var(--muted)"}}>Logged in as</p>
              <p style={{margin:0,fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{role ?? "User"}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">
            Logout
          </button>
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
