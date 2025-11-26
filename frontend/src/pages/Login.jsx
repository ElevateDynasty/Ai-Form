import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import './login.css';

const roles = [
  {
    key: 'user',
    label: 'User',
    tagline: 'Auto-fill and download forms',
  },
  {
    key: 'admin',
    label: 'Admin',
    tagline: 'Review submissions and manage templates',
  },
];

export default function Login(){
  const navigate = useNavigate();
  const { login, registerUser, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
      setError('Please fill username and password');
      return;
    }
    setLoading(true);
    try{
      if(mode === 'login'){
        await login(form.username, form.password, { remember });
        setMessage('Welcome back! Redirecting...');
      }else{
        await registerUser(form, { remember });
        setMessage('Account created! Redirecting...');
      }
    }catch(e){
      setError(e.message || 'Request failed');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="auth-hero">
      <div className="auth-background" />
      <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="auth-header">
          <div className="auth-logo">AI</div>
          <div>
            <p className="eyebrow">AI Universal Form Suite</p>
            <h1>Sign in or register</h1>
            <p className="lead">Choose your role and manage forms with OCR + Voice automation.</p>
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
          <button type="button" className={mode === 'login' ? 'pill active' : 'pill'} onClick={()=>setMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'pill active' : 'pill'} onClick={()=>setMode('register')}>Register</button>
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
              placeholder="Username"
              value={form.username}
              onChange={(e)=>setForm((prev)=>({ ...prev, username: e.target.value }))}
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e)=>setForm((prev)=>({ ...prev, password: e.target.value }))}
            />
            <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} /> Remember me on this device
            </label>
            {error && <div className="error" style={{ width: '100%' }}>{error}</div>}
            {message && <div className="success-msg">{message}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Continue' : 'Create account')}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="demo-row">
          <p className="muted">Need quick access?</p>
          <div className="demo-actions">
            <button type="button" className="btn btn-ghost" onClick={()=>fillDemo('user')}>Demo User</button>
            <button type="button" className="btn btn-ghost" onClick={()=>fillDemo('admin')}>Demo Admin</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
