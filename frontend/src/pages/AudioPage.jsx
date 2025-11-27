import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../AuthContext';

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

export default function AudioPage(){
  const { setVoiceText } = useAuth();
  const [browserSupported, setBrowserSupported] = useState(false);
  const [browserListening, setBrowserListening] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [text, setText] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [sttLang, setSttLang] = useState('en');
  const [ttsLang, setTtsLang] = useState('en');
  const [sttStatus, setSttStatus] = useState('Ready');
  const [ttsStatus, setTtsStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const recognitionRef = useRef(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Server transcription states
  const [serverTranscribing, setServerTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sttMode, setSttMode] = useState('auto'); // 'auto', 'server', 'browser'
  const [usingFallback, setUsingFallback] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SpeechRecognition){ setBrowserSupported(true); }
    return ()=>{ 
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Browser STT functions
  const stopBrowserStt = ()=>{
    recognitionRef.current?.stop();
    setBrowserListening(false);
  };

  const startBrowserStt = (isFallback = false)=>{
    if(isFallback) {
      setUsingFallback(true);
      setSttStatus('⚠️ Server failed, using browser fallback...');
    }
    
    if(!browserSupported){
      setError('Browser speech recognition is not supported');
      return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sttLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = ()=>{
      setBrowserListening(true);
      if(!isFallback) {
        setText('');
        setVoiceText('');
      }
      setInterimTranscript('');
      setSttStatus(isFallback ? '🔄 Fallback: Listening via browser...' : '🎤 Listening via browser...');
    };
    
    recognition.onerror = (event)=>{
      setError(event.error === 'not-allowed' ? 'Microphone blocked' : 'Browser STT error');
      stopBrowserStt();
    };
    
    recognition.onresult = (event)=>{
      let interim = '';
      let finalChunks = [];
      for(let i = event.resultIndex; i < event.results.length; i++){
        const transcript = event.results[i][0].transcript;
        if(event.results[i].isFinal){ finalChunks.push(transcript); }
        else { interim += transcript; }
      }
      if(finalChunks.length){
        setText(prev => {
          const next = `${prev} ${finalChunks.join(' ')}`.trim();
          setVoiceText(next);
          return next;
        });
      }
      setInterimTranscript(interim);
    };
    
    recognition.onend = ()=>{
      setBrowserListening(false);
      recognitionRef.current = null;
      setInterimTranscript('');
      setUsingFallback(false);
      setSttStatus('✅ Completed');
    };
    
    recognition.start();
    return true;
  };

  // Unified recording - records audio for server transcription
  const startRecording = async () => {
    setError('');
    setUsingFallback(false);
    setText('');
    setVoiceText('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Automatically transcribe with server (AssemblyAI priority)
        await transcribeWithServerAndFallback(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSttStatus('🔴 Recording... (AssemblyAI will process)');
    } catch (err) {
      setError('Microphone access denied');
      // Fallback to browser if mic access works but recording fails
      if (browserSupported) {
        startBrowserStt(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSttStatus('⏳ Processing with AssemblyAI...');
    }
  };

  // Server transcription with automatic browser fallback
  const transcribeWithServerAndFallback = async (blob) => {
    setServerTranscribing(true);
    setSttStatus('🤖 Sending to AssemblyAI...');
    
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      
      const res = await fetch(`${API_BASE}/voice/transcribe?lang=${sttLang}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server transcription failed' }));
        throw new Error(err.detail);
      }
      
      const data = await res.json();
      
      if (data.text) {
        setText(data.text);
        setVoiceText(data.text);
        setSttStatus(`✅ AssemblyAI: Transcribed${data.confidence ? ` (${Math.round(data.confidence * 100)}%)` : ''}`);
      } else {
        throw new Error('Empty transcription result');
      }
    } catch (err) {
      console.error('Server transcription failed:', err);
      setError(`Server failed: ${err.message}. Switching to browser...`);
      
      // Automatic fallback to browser STT
      if (browserSupported) {
        setSttStatus('🔄 Falling back to browser recognition...');
        setTimeout(() => {
          startBrowserStt(true);
        }, 500);
      } else {
        setSttStatus('❌ Transcription failed (no fallback available)');
      }
    }
    setServerTranscribing(false);
  };

  // Toggle recording (main button)
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else if (browserListening) {
      stopBrowserStt();
    } else {
      startRecording();
    }
  };

  // Manual browser-only mode
  const startBrowserOnly = () => {
    if (browserListening) {
      stopBrowserStt();
    } else {
      setError('');
      setText('');
      setVoiceText('');
      startBrowserStt(false);
    }
  };

  const synthesize = async ()=>{
    if(!ttsText){ setError('Enter text to convert to speech'); return; }
    setError('');
    setTtsStatus('Generating speech...');
    setTtsLoading(true);
    try{
      const res = await fetch(`${API_BASE}/voice/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, lang: ttsLang }),
      });
      if(!res.ok){
        const msg = await res.json().catch(()=>({ detail: 'TTS failed' }));
        throw new Error(msg.detail);
      }
      const blob = await res.blob();
      if(audioUrl){ URL.revokeObjectURL(audioUrl); }
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTtsStatus('Ready to play');
    }catch(e){ setError(e.message || 'TTS failed'); setTtsStatus('Failed'); }
    setTtsLoading(false);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Voice to Text Card */}
      <div className="card">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{
              width:48, height:48, borderRadius:14, 
              background: (isRecording || browserListening) 
                ? "linear-gradient(135deg, #10b981, #059669)" 
                : "linear-gradient(135deg, var(--primary), var(--accent))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24,
              boxShadow: (isRecording || browserListening) 
                ? "0 8px 24px rgba(16,185,129,0.3)" 
                : "0 8px 24px rgba(99,102,241,0.2)"
            }}>
              🎤
            </div>
            <div>
              <h3 className="section-title" style={{fontSize:18, margin:0}}>Voice to Text</h3>
              <p className="muted" style={{fontSize:12, margin:0}}>AssemblyAI + Browser Fallback</p>
            </div>
          </div>
          <span className={`badge ${(isRecording || browserListening) ? 'success animate-pulse' : serverTranscribing ? 'warning animate-pulse' : ''}`} style={{padding:'8px 14px'}}>
            {isRecording ? '● Recording' : browserListening ? '● Browser STT' : serverTranscribing ? '⏳ Processing' : 'Ready'}
          </span>
        </div>
        
        <p className="muted" style={{ marginBottom: 24, background:"linear-gradient(135deg, rgba(191, 0, 255, 0.08), rgba(0, 245, 255, 0.05))", padding:12, borderRadius:10, fontSize:13, border:"1px solid rgba(191, 0, 255, 0.15)" }}>
          🤖 <strong>AssemblyAI</strong> is used first for accurate transcription. If it fails, automatically falls back to browser speech recognition.
        </p>
        
        {error && <div className="error" style={{marginBottom:16}}>⚠️ {error}</div>}
        
        {/* Status indicator */}
        <div style={{
          marginBottom: 16,
          padding: 10,
          borderRadius: 8,
          background: usingFallback 
            ? "rgba(245, 158, 11, 0.1)" 
            : sttStatus.includes('AssemblyAI') 
              ? "rgba(16, 185, 129, 0.1)" 
              : "rgba(0, 245, 255, 0.05)",
          border: `1px solid ${usingFallback ? "rgba(245, 158, 11, 0.3)" : "rgba(0, 245, 255, 0.1)"}`,
          fontSize: 13,
          textAlign: "center"
        }}>
          {sttStatus}
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
              🌐 Spoken Language
            </label>
            <select value={sttLang} onChange={(e)=>setSttLang(e.target.value)} disabled={isRecording || browserListening}>
              {LANG_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <span>📝 Transcript</span>
              {text && <span className="badge" style={{fontSize:11}}>{text.split(' ').filter(Boolean).length} words</span>}
            </label>
            <div className="output" style={{
              minHeight:180, maxHeight:300, overflowY:'auto',
              background: (isRecording || browserListening) ? "rgba(0, 255, 136, 0.08)" : "rgba(0, 245, 255, 0.03)",
              border: (isRecording || browserListening) ? "2px solid rgba(16,185,129,0.2)" : "1px solid var(--border)",
              transition: "all 0.3s ease"
            }}>
              {interimTranscript || text ? (
                <span>
                  {text}
                  {interimTranscript && <span style={{color:"var(--muted)", fontStyle:"italic"}}> {interimTranscript}</span>}
                </span>
              ) : (
                <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, opacity:0.5}}>
                  <span style={{fontSize:32}}>🎙️</span>
                  <span className="muted">Click record to start...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Record Button - Uses AssemblyAI with fallback */}
        <button 
          className={`btn ${(isRecording || browserListening) ? 'btn-danger' : 'btn-primary'} btn-lg`} 
          onClick={toggleRecording}
          disabled={serverTranscribing}
          style={{width:'100%', justifyContent:'center', marginTop:24, background: !(isRecording || browserListening) ? "linear-gradient(135deg, #bf00ff, #ff00ff)" : undefined}}
        >
          {isRecording ? (
            <><span style={{display:"inline-block", width:10, height:10, background:"#fff", borderRadius:"50%", animation:"pulse 1s infinite"}}></span> Stop & Transcribe</>
          ) : browserListening ? (
            <><span style={{display:"inline-block", width:10, height:10, background:"#fff", borderRadius:"50%", animation:"pulse 1s infinite"}}></span> Stop Recording</>
          ) : serverTranscribing ? (
            '⏳ Processing...'
          ) : (
            '🎤 Start Recording (AI)'
          )}
        </button>

        {/* Browser-only option */}
        <div style={{marginTop: 16, display: "flex", gap: 10, justifyContent: "center"}}>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={startBrowserOnly}
            disabled={isRecording || serverTranscribing || !browserSupported}
            style={{fontSize: 12}}
          >
            {browserListening ? '⏹️ Stop Browser STT' : '🌐 Use Browser Only'}
          </button>
        </div>
        
        {!browserSupported && (
          <p className="muted" style={{fontSize:11, marginTop:10, textAlign:"center", color:"#f59e0b"}}>
            ⚠️ Browser STT not supported - AssemblyAI only mode
          </p>
        )}
      </div>

      {/* Text to Speech Card */}
      <div className="card">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{
              width:48, height:48, borderRadius:14, 
              background:"linear-gradient(135deg, #ff00ff, #bf00ff)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24,
              boxShadow:"0 8px 24px rgba(255,0,255,0.3)"
            }}>
              🔊
            </div>
            <div>
              <h3 className="section-title" style={{fontSize:18, margin:0}}>Text to Speech</h3>
              <p className="muted" style={{fontSize:12, margin:0}}>Audio Generation</p>
            </div>
          </div>
          {audioUrl && <span className="badge success">Audio Ready</span>}
        </div>
        
        <p className="muted" style={{ marginBottom: 24, background:"rgba(191, 0, 255, 0.05)", padding:12, borderRadius:10, fontSize:13, border:"1px solid rgba(191, 0, 255, 0.1)" }}>
          🎵 Convert text into natural sounding speech using server-side TTS engine.
        </p>
        
        <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
              ✍️ Text to Speak
            </label>
            <textarea
              rows={6}
              placeholder="Enter or paste text to convert to speech..."
              value={ttsText}
              onChange={(e)=>setTtsText(e.target.value)}
              style={{resize:"vertical"}}
            />
            <p className="muted" style={{fontSize:11, marginTop:6, textAlign:"right"}}>
              {ttsText.length} characters
            </p>
          </div>

          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
              🌐 Voice Language
            </label>
            <select value={ttsLang} onChange={(e)=>setTtsLang(e.target.value)}>
              {LANG_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-lg" 
          onClick={synthesize} 
          disabled={ttsLoading || !ttsText.trim()}
          style={{width:'100%', justifyContent:'center', marginTop:24}}
        >
          {ttsLoading ? <><span className="spinner"></span> Generating Audio...</> : '🔊 Generate Audio'}
        </button>
          
        {audioUrl && (
          <div style={{
            marginTop:20,
            background:'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
            padding:20, 
            borderRadius:16,
            border:"1px solid rgba(16,185,129,0.15)"
          }}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
              <span style={{fontWeight:600, fontSize:14}}>🎧 Audio Player</span>
              <span className="badge success">Ready to play</span>
            </div>
            <audio controls style={{width:'100%', height:48, borderRadius:8}} src={audioUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
