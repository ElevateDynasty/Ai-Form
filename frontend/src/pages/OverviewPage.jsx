import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../LanguageContext";

export default function OverviewPage() {
  const { language } = useLanguage();

  const features = [
    {
      icon: "📄",
      title: language === "hi" ? "OCR निष्कर्षण" : "OCR Extraction",
      desc: language === "hi" 
        ? "PDF और इमेज से स्वचालित रूप से फ़ील्ड निकालें"
        : "Automatically extract fields from PDFs and images using advanced OCR technology",
    },
    {
      icon: "🎤",
      title: language === "hi" ? "वॉइस इनपुट" : "Voice Input",
      desc: language === "hi"
        ? "हैंड्स-फ्री फॉर्म भरने के लिए स्पीच-टू-टेक्स्ट"
        : "Browser-based speech-to-text for hands-free form filling with natural commands",
    },
    {
      icon: "🔊",
      title: language === "hi" ? "टेक्स्ट-टू-स्पिच" : "Text-to-Speech",
      desc: language === "hi"
        ? "टेक्स्ट को अंग्रेजी और हिंदी में ऑडियो में बदलें"
        : "Convert text to natural audio in English & Hindi for accessibility",
    },
    {
      icon: "🤖",
      title: language === "hi" ? "AI टेक्स्ट प्रोसेसिंग" : "AI Text Processing",
      desc: language === "hi"
        ? "tinyBART का उपयोग करके टेक्स्ट साफ़ करें, सारांश बनाएं"
        : "Clean, summarize, and extract key phrases using tinyBART AI model",
    },
    {
      icon: "✨",
      title: language === "hi" ? "स्मार्ट फॉर्म जनरेशन" : "Smart Form Generation",
      desc: language === "hi"
        ? "प्राकृतिक भाषा प्रॉम्प्ट से फॉर्म बनाएं"
        : "Create forms from natural language prompts using intelligent keyword detection",
    },
    {
      icon: "🌐",
      title: language === "hi" ? "द्विभाषी समर्थन" : "Bilingual Support",
      desc: language === "hi"
        ? "पूरे ऐप में अंग्रेजी/हिंदी अनुवाद"
        : "Full English/Hindi translation throughout the entire application",
    },
    {
      icon: "📝",
      title: language === "hi" ? "विजुअल फॉर्म बिल्डर" : "Visual Form Builder",
      desc: language === "hi"
        ? "फॉर्म टेम्पलेट बनाने और प्रबंधित करने के लिए एडमिन इंटरफ़ेस"
        : "Admin interface to create and manage form templates with drag-and-drop ease",
    },
    {
      icon: "📑",
      title: language === "hi" ? "PDF ऑटो-फ़िल" : "PDF Auto-Fill",
      desc: language === "hi"
        ? "JSON डेटा को PDF टेम्पलेट के साथ मर्ज करें"
        : "Merge JSON data with fillable PDF templates for professional output",
    },
  ];

  const techStack = [
    { name: "React", icon: "⚛️", desc: "Frontend Framework" },
    { name: "FastAPI", icon: "🐍", desc: "Backend API" },
    { name: "tinyBART", icon: "🧠", desc: "AI Processing" },
    { name: "SQLite", icon: "💾", desc: "Database" },
    { name: "gTTS", icon: "🔈", desc: "Text-to-Speech" },
    { name: "PyPDF2", icon: "📄", desc: "PDF Processing" },
  ];

  return (
    <div className="animate-slide-up">
      {/* Hero Section */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a1a2e 100%)",
        color: "#ffffff",
        padding: "48px 40px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(0, 245, 255, 0.2)"
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, #00f5ff, #bf00ff, #ff00ff, transparent)"
        }} />
        
        <p style={{ 
          fontSize: 11, 
          textTransform: "uppercase", 
          letterSpacing: "0.2em", 
          color: "#00f5ff", 
          marginBottom: 12,
          fontWeight: 600 
        }}>
          {language === "hi" ? "अवलोकन" : "Project Overview"}
        </p>
        
        <h1 style={{ 
          fontSize: 36, 
          fontFamily: "'Orbitron', sans-serif",
          marginBottom: 16,
          letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #00f5ff, #bf00ff, #ff00ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          AI Form Assistant
        </h1>
        
        <p style={{ 
          fontSize: 17, 
          lineHeight: 1.7, 
          maxWidth: 700, 
          color: "rgba(255, 255, 255, 0.7)"
        }}>
          {language === "hi" 
            ? "एक सुरुचिपूर्ण, AI-संचालित फॉर्म प्रोसेसिंग प्लेटफ़ॉर्म जो OCR, वॉइस इनपुट, स्मार्ट फॉर्म जनरेशन और द्विभाषी समर्थन के साथ आता है।"
            : "An elegant, AI-powered form processing platform with OCR, voice input, smart form generation, and bilingual support for English and Hindi."}
        </p>

        <div style={{ 
          marginTop: 24, 
          padding: "20px 24px", 
          background: "rgba(0, 245, 255, 0.05)", 
          borderRadius: 12, 
          borderLeft: "3px solid #00f5ff",
          maxWidth: 700
        }}>
          <p style={{ 
            fontSize: 14, 
            lineHeight: 1.8, 
            color: "rgba(255, 255, 255, 0.7)", 
            margin: 0 
          }}>
            {language === "hi" 
              ? "AI Form Assistant आपके फॉर्म प्रबंधन को सरल बनाता है। सरकारी दस्तावेज़ों, एप्लिकेशन फॉर्म, या किसी भी पेपरवर्क के लिए — बस अपना दस्तावेज़ अपलोड करें और हमारा AI स्वचालित रूप से फ़ील्ड निकालता है। वॉइस से टाइप करें, AI-जनित फॉर्म टेम्पलेट बनाएं, और हिंदी-अंग्रेजी में सहज अनुवाद पाएं। यह प्लेटफ़ॉर्म उन लोगों के लिए है जो कागजी कार्रवाई में समय बचाना चाहते हैं।"
              : "AI Form Assistant simplifies your form management workflow. Whether it's government documents, application forms, or any paperwork — just upload your document and our AI automatically extracts fields using OCR. Type with your voice using speech recognition, create AI-generated form templates from simple text prompts, and seamlessly translate between Hindi and English. Built for individuals and organizations who want to save time on paperwork and improve accessibility."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <Link to="/forms" className="btn btn-primary" style={{ padding: "12px 24px" }}>
            {language === "hi" ? "फॉर्म शुरू करें" : "Get Started"} →
          </Link>
          <Link to="/contact" className="btn btn-secondary">
            {language === "hi" ? "संपर्क करें" : "Contact Us"}
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ 
          fontSize: 20, 
          fontFamily: "'Orbitron', sans-serif",
          marginBottom: 20,
          background: "linear-gradient(135deg, #00f5ff, #bf00ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          {language === "hi" ? "मुख्य विशेषताएं" : "Key Features"}
        </h2>
        
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="card hover-lift"
              style={{ 
                padding: 22, 
                textAlign: "center",
                border: "1px solid var(--border)",
                cursor: "default",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.5)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 245, 255, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ 
                fontSize: 32, 
                marginBottom: 12,
                filter: "drop-shadow(0 0 8px rgba(0, 245, 255, 0.4))"
              }}>
                {feature.icon}
              </div>
              <h4 style={{ 
                margin: "0 0 8px", 
                fontSize: 14,
                fontFamily: "'Orbitron', sans-serif"
              }}>
                {feature.title}
              </h4>
              <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ 
            fontSize: 17, 
            fontFamily: "'Orbitron', sans-serif",
            marginBottom: 20,
            marginTop: 0,
            color: "var(--neon-cyan)"
          }}>
            {language === "hi" ? "टेक स्टैक" : "Technology Stack"}
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {techStack.map((tech, idx) => (
              <div 
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 14,
                  background: "rgba(0, 245, 255, 0.05)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0, 245, 255, 0.3)";
                  e.currentTarget.style.background = "rgba(0, 245, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "rgba(0, 245, 255, 0.05)";
                }}
              >
                <span style={{ fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>{tech.icon}</span>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <strong style={{ fontSize: 13 }}>{tech.name}</strong>
                  <p className="muted" style={{ fontSize: 11, margin: 0 }}>{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ 
            fontSize: 17, 
            fontFamily: "'Orbitron', sans-serif",
            marginBottom: 20,
            marginTop: 0,
            color: "var(--neon-pink)"
          }}>
            {language === "hi" ? "त्वरित आंकड़े" : "Quick Stats"}
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { value: "2", label: language === "hi" ? "भाषाएं" : "Languages" },
              { value: "8+", label: language === "hi" ? "विशेषताएं" : "Features" },
              { value: "100%", label: language === "hi" ? "ओपन सोर्स" : "Open Source" },
              { value: "MIT", label: language === "hi" ? "लाइसेंस" : "License" },
            ].map((stat, idx) => (
              <div 
                key={idx}
                style={{
                  textAlign: "center",
                  padding: 20,
                  background: "linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(191, 0, 255, 0.1) 100%)",
                  borderRadius: 12,
                  border: "1px solid rgba(0, 245, 255, 0.2)"
                }}
              >
                <div style={{ 
                  fontSize: 28, 
                  fontWeight: 700, 
                  fontFamily: "'Orbitron', sans-serif",
                  background: "linear-gradient(135deg, #00f5ff, #bf00ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  {stat.value}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: 20, 
            padding: 16, 
            background: "rgba(0, 245, 255, 0.05)", 
            borderRadius: 10,
            border: "1px solid var(--border)"
          }}>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              {language === "hi" 
                ? "यह प्रोजेक्ट MIT लाइसेंस के तहत ओपन सोर्स है। GitHub पर योगदान करें!"
                : "This project is open source under MIT License. Contributions are welcome on GitHub!"}
            </p>
            <a 
              href="https://github.com/ElevateDynasty/Ai-Form" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12 }}
            >
              ⭐ GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
