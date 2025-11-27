import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { useLanguage, LANGUAGES } from '../LanguageContext';
import './login.css';

export default function Login(){
  const navigate = useNavigate();
  const { login, registerUser, isAuthenticated } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const roles = [
    {
      key: 'user',
      label: t('role_user'),
      tagline: t('role_user_desc'),
    },
    {
      key: 'admin',
      label: t('role_admin'),
      tagline: t('role_admin_desc'),
    },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(()=>{
    if(isAuthenticated){
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (role)=>{
    setForm((prev)=> ({ ...prev, role }));
  };

  const fillDemo = (roleKey)=>{
    if(roleKey === 'admin'){
      setForm({ username: 'admin', password: 'adminpass', role: 'admin' });
    }else{
      setForm({ username: 'user', password: 'userpass', role: 'user' });
    }
    setMode('login');
  };

  const submit = async (evt)=>{
    evt.preventDefault();
    setError('');
    setMessage('');
    if(!form.username || !form.password){
      setError(t('error') + ': ' + t('username') + ' & ' + t('password'));
      return;
    }
    setLoading(true);
    try{
      if(mode === 'login'){
        await login(form.username, form.password, { remember });
        setMessage(t('success') + '! Redirecting...');
      }else{
        await registerUser(form, { remember });
        setMessage(t('success') + '! Redirecting...');
      }
    }catch(e){
      setError(e.message || t('error'));
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="auth-hero">
      <div className="auth-background" />
      
      {/* Language Selector in top right */}
      <div style={{ 
        position: "absolute", 
        top: 20, 
        right: 20, 
        zIndex: 100 
      }}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              background: "rgba(20, 20, 35, 0.9)",
              backdropFilter: "blur(10px)",
              padding: "10px 16px",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.3), 0 0 20px rgba(0, 245, 255, 0.1)",
              border: "1px solid rgba(0, 245, 255, 0.2)",
              color: "#ffffff"
            }}
          >
            <span style={{ fontSize: 18 }}>{currentLang.flag}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{currentLang.label}</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
          </button>
          
          {showLangMenu && (
            <>
              <div 
                style={{ position: "fixed", inset: 0, zIndex: 99 }} 
                onClick={() => setShowLangMenu(false)} 
              />
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                background: "rgba(20, 20, 35, 0.95)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(0, 245, 255, 0.1)",
                border: "1px solid rgba(0, 245, 255, 0.2)",
                zIndex: 100,
                minWidth: 180,
                maxHeight: 360,
                overflowY: "auto",
                padding: 8,
                backdropFilter: "blur(20px)"
              }}>
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
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      border: "none",
                      background: language === lang.code ? "rgba(0, 245, 255, 0.15)" : "transparent",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      textAlign: "left",
                      transition: "background 0.15s",
                      color: "#ffffff"
                    }}
                    onMouseEnter={e => {
                      if(language !== lang.code) e.target.style.background = "rgba(0, 245, 255, 0.08)";
                    }}
                    onMouseLeave={e => {
                      if(language !== lang.code) e.target.style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{lang.flag}</span>
                    <span style={{ 
                      fontWeight: language === lang.code ? 600 : 400,
                      color: language === lang.code ? "#00f5ff" : "inherit"
                    }}>{lang.label}</span>
                    {language === lang.code && (
                      <span style={{ marginLeft: "auto", color: "#00f5ff" }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div className="auth-header">
          <div className="auth-logo">AI</div>
          <div>
            <p className="eyebrow">{t('app_name')}</p>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif" }}>{t('login_title')}</h1>
            <p className="lead">{t('login_subtitle')}</p>
          </div>
        </div>

        <div className="role-toggle">
          {roles.map((r) => (
            <button
              key={r.key}
              className={form.role === r.key ? 'role-card active' : 'role-card'}
              type="button"
              onClick={()=>handleRoleSelect(r.key)}
            >
              <div className="role-dot" />
              <div>
                <p className="role-label">{r.label}</p>
                <p className="role-tagline">{r.tagline}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mode-switch">
          <button type="button" className={mode === 'login' ? 'pill active' : 'pill'} onClick={()=>setMode('login')}>{t('login_tab')}</button>
          <button type="button" className={mode === 'register' ? 'pill active' : 'pill'} onClick={()=>setMode('register')}>{t('register_tab')}</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            className="auth-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            onSubmit={submit}
          >
            <input
              placeholder={t('username')}
              value={form.username}
              onChange={(e)=>setForm((prev)=>({ ...prev, username: e.target.value }))}
            />
            <input
              placeholder={t('password')}
              type="password"
              value={form.password}
              onChange={(e)=>setForm((prev)=>({ ...prev, password: e.target.value }))}
            />
            <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} /> {t('remember_me')}
            </label>
            {error && <div className="error" style={{ width: '100%' }}>{error}</div>}
            {message && <div className="success-msg">{message}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? t('signing_in') : t('creating_account')) : (mode === 'login' ? t('continue_btn') : t('create_account'))}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="demo-row">
          <p className="muted">{t('quick_access')}</p>
          <div className="demo-actions">
            <button type="button" className="btn btn-ghost" onClick={()=>fillDemo('user')}>{t('demo_user')}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>fillDemo('admin')}>{t('demo_admin')}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
