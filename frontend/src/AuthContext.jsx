import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "./config";

const AuthContext = createContext(null);

export function useAuth(){
  return useContext(AuthContext);
}

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => localStorage.getItem('ai_form_token'));
  const [role, setRole] = useState(() => localStorage.getItem('ai_form_role'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('ai_form_token'));

  // shared app data
  const [extractedFields, setExtractedFields] = useState({});
  const [voiceText, setVoiceText] = useState("");
  const [voiceNavListening, setVoiceNavListening] = useState(false);
  const [voiceNavStatus, setVoiceNavStatus] = useState("Voice navigation idle");

  async function handleAuthResponse(res, opts){
    if(!res.ok){
      let detail = 'Authentication failed';
      try{
        const err = await res.json();
        detail = err.detail || detail;
      }catch{}
      throw new Error(detail);
    }
    const data = await res.json();
    setToken(data.access_token);
    setRole(data.role);
    setIsAuthenticated(true);
    if(opts.remember){
      localStorage.setItem('ai_form_token', data.access_token);
      localStorage.setItem('ai_form_role', data.role);
    }
    return data;
  }

  async function login(username, password, opts = { remember: true }){
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return handleAuthResponse(res, opts);
  }

  async function registerUser({ username, password, role }, opts = { remember: true }){
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    return handleAuthResponse(res, opts);
  }

  async function logout(){
    if(token){
      try{ await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); }catch(e){}
    }
    setToken(null); setRole(null); setIsAuthenticated(false);
    localStorage.removeItem('ai_form_token');
    localStorage.removeItem('ai_form_role');
  }

  // rehydrate on mount (in case token was in localStorage)
  useEffect(()=>{
    const t = localStorage.getItem('ai_form_token');
    const r = localStorage.getItem('ai_form_role');
    if(t){ setToken(t); setRole(r); setIsAuthenticated(true); }
  }, []);

  const value = {
    token, role, isAuthenticated, login, registerUser, logout,
    extractedFields,
    setExtractedFields,
    voiceText,
    setVoiceText,
    voiceNavListening,
    setVoiceNavListening,
    voiceNavStatus,
    setVoiceNavStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
