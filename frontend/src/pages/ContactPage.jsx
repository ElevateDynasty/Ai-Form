import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";

export default function ContactPage() {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, just show a success message (no backend integration)
    setStatus(language === "hi" 
      ? "✅ संदेश भेज दिया गया! हम जल्द ही संपर्क करेंगे।"
      : "✅ Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setStatus(""), 5000);
  };

  const contactInfo = [
    {
      icon: "📧",
      title: language === "hi" ? "ईमेल" : "Email",
      value: "contact@aiform.dev",
      link: "mailto:contact@aiform.dev"
    },
    {
      icon: "🐙",
      title: "GitHub",
      value: "ElevateDynasty/Ai-Form",
      link: "https://github.com/ElevateDynasty/Ai-Form"
    },
    {
      icon: "📍",
      title: language === "hi" ? "स्थान" : "Location",
      value: language === "hi" ? "भारत" : "India",
      link: null
    }
  ];

  const faqs = [
    {
      q: language === "hi" ? "क्या यह प्रोजेक्ट फ्री है?" : "Is this project free to use?",
      a: language === "hi" 
        ? "हां! यह MIT लाइसेंस के तहत ओपन सोर्स है।"
        : "Yes! It's open source under the MIT License."
    },
    {
      q: language === "hi" ? "मैं कैसे योगदान कर सकता हूं?" : "How can I contribute?",
      a: language === "hi"
        ? "GitHub पर fork करें और pull request भेजें।"
        : "Fork the repo on GitHub and submit a pull request."
    },
    {
      q: language === "hi" ? "कौन सी भाषाएं समर्थित हैं?" : "What languages are supported?",
      a: language === "hi"
        ? "वर्तमान में अंग्रेजी और हिंदी पूरी तरह से समर्थित हैं।"
        : "Currently English and Hindi are fully supported."
    }
  ];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #1a1612 0%, #2d2620 50%, #3d3429 100%)",
        color: "#faf9f7",
        padding: "40px 36px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(184, 149, 110, 0.3)"
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, #b8956e, #c4a97d, #b8956e, transparent)"
        }} />
        
        <p style={{ 
          fontSize: 11, 
          textTransform: "uppercase", 
          letterSpacing: "0.2em", 
          color: "#c4a97d", 
          marginBottom: 10,
          fontWeight: 600 
        }}>
          {language === "hi" ? "संपर्क" : "Get in Touch"}
        </p>
        
        <h1 style={{ 
          fontSize: 32, 
          fontFamily: "'Playfair Display', Georgia, serif",
          marginBottom: 12,
          color: "#faf9f7"
        }}>
          {language === "hi" ? "हमसे संपर्क करें" : "Contact Us"}
        </h1>
        
        <p style={{ fontSize: 15, color: "#d4cfc7", margin: 0, fontStyle: "italic" }}>
          {language === "hi" 
            ? "प्रश्न, सुझाव या फीडबैक? हम सुनना पसंद करेंगे!"
            : "Questions, suggestions, or feedback? We'd love to hear from you!"}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Contact Form */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ 
            fontSize: 18, 
            fontFamily: "'Playfair Display', Georgia, serif",
            marginTop: 0,
            marginBottom: 20
          }}>
            {language === "hi" ? "संदेश भेजें" : "Send a Message"}
          </h3>

          {status && (
            <div className="success" style={{ marginBottom: 16 }}>{status}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
              <div className="field">
                <label>{language === "hi" ? "नाम" : "Name"} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={language === "hi" ? "आपका नाम" : "Your name"}
                />
              </div>
              <div className="field">
                <label>{language === "hi" ? "ईमेल" : "Email"} *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={language === "hi" ? "आपका ईमेल" : "your@email.com"}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>{language === "hi" ? "विषय" : "Subject"}</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={language === "hi" ? "किस बारे में?" : "What's this about?"}
              />
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label>{language === "hi" ? "संदेश" : "Message"} *</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={language === "hi" ? "आपका संदेश..." : "Your message..."}
                style={{ resize: "vertical" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              {language === "hi" ? "📤 भेजें" : "📤 Send Message"}
            </button>
          </form>
        </div>

        {/* Contact Info & FAQ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Contact Info */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ 
              fontSize: 18, 
              fontFamily: "'Playfair Display', Georgia, serif",
              marginTop: 0,
              marginBottom: 20
            }}>
              {language === "hi" ? "संपर्क जानकारी" : "Contact Information"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {contactInfo.map((info, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    background: "var(--bg-subtle)",
                    borderRadius: 12,
                    border: "1px solid var(--border)"
                  }}
                >
                  <span style={{ fontSize: 24 }}>{info.icon}</span>
                  <div>
                    <p className="muted" style={{ fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {info.title}
                    </p>
                    {info.link ? (
                      <a 
                        href={info.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontWeight: 500, color: "var(--primary)" }}
                      >
                        {info.value}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{info.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ 
              fontSize: 18, 
              fontFamily: "'Playfair Display', Georgia, serif",
              marginTop: 0,
              marginBottom: 20
            }}>
              {language === "hi" ? "अक्सर पूछे जाने वाले प्रश्न" : "FAQ"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {faqs.map((faq, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: 16,
                    background: "linear-gradient(135deg, var(--gold-light) 0%, var(--primary-light) 100%)",
                    borderRadius: 12,
                    border: "1px solid var(--gold)"
                  }}
                >
                  <p style={{ 
                    fontWeight: 600, 
                    fontSize: 13, 
                    margin: "0 0 6px",
                    color: "var(--primary)"
                  }}>
                    {faq.q}
                  </p>
                  <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
