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
  const [sttStatus, setSttStatus] = useState('Browser STT idle');
  const [ttsStatus, setTtsStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const recognitionRef = useRef(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Server transcription states
  const [serverTranscribing, setServerTranscribing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SpeechRecognition){ setBrowserSupported(true); }
    return ()=>{ recognitionRef.current?.stop(); };
  }, []);

  const stopBrowserStt = ()=>{
    recognitionRef.current?.stop();
  };

  const startBrowserStt = ()=>{
    setError('');
    if(!browserSupported){
      setError('Browser speech recognition is not supported here');
      return;
    }
    if(browserListening){
      stopBrowserStt();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      setError('Browser speech recognition is not supported here');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sttLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = ()=>{
      setBrowserListening(true);
      setText('');
      setVoiceText('');
      setInterimTranscript('');
      setSttStatus('Listening via browser...');
    };
    recognition.onerror = (event)=>{
      setError(event.error === 'not-allowed' ? 'Microphone blocked for this site' : 'Browser STT error');
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
      setSttStatus(prev => prev.includes('Listening') ? 'Completed' : prev);
    };
    recognition.start();
  };

  // Server-side recording functions
  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSttStatus('Recording for server transcription...');
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSttStatus('Recording stopped. Click transcribe to process.');
    }
  };

  const transcribeWithServer = async () => {
    if (!recordedBlob) {
      setError('No recording to transcribe');
      return;
    }
    setError('');
    setServerTranscribing(true);
    setSttStatus('Sending to AssemblyAI...');
    
    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'recording.webm');
      
      const res = await fetch(`${API_BASE}/voice/transcribe?lang=${sttLang}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
        throw new Error(err.detail);
      }
      
      const data = await res.json();
      setText(data.text || '');
      setVoiceText(data.text || '');
      setSttStatus(`Transcribed successfully${data.confidence ? ` (${Math.round(data.confidence * 100)}% confidence)` : ''}`);
      setRecordedBlob(null);
    } catch (err) {
      setError(err.message || 'Transcription failed');
      setSttStatus('Transcription failed');
    }
    setServerTranscribing(false);
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
              background: browserListening ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, var(--primary), var(--accent))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24,
              boxShadow: browserListening ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(99,102,241,0.2)"
            }}>
              🎤
            </div>
            <div>
              <h3 className="section-title" style={{fontSize:18, margin:0}}>Voice to Text</h3>
              <p className="muted" style={{fontSize:12, margin:0}}>Speech Recognition</p>
            </div>
          </div>
          <span className={`badge ${browserListening ? 'success animate-pulse' : ''}`} style={{padding:'8px 14px'}}>
            {browserListening ? '● Recording' : 'Ready'}
          </span>
        </div>
        
        <p className="muted" style={{ marginBottom: 24, background:"rgba(0, 245, 255, 0.05)", padding:12, borderRadius:10, fontSize:13, border:"1px solid rgba(0, 245, 255, 0.1)" }}>
          💡 Browser-based speech recognition. Works best in Chrome/Edge. Speaks are transcribed in real-time.
        </p>
        
        {error && <div className="error" style={{marginBottom:16}}>⚠️ {error}</div>}

        <div className="form-grid" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
              🌐 Spoken Language
            </label>
            <select value={sttLang} onChange={(e)=>setSttLang(e.target.value)}>
              {LANG_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label style={{fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <span>📝 Live Transcript</span>
              {text && <span className="badge" style={{fontSize:11}}>{text.split(' ').filter(Boolean).length} words</span>}
            </label>
            <div className="output" style={{
              minHeight:180, maxHeight:300, overflowY:'auto',
              background: browserListening ? "rgba(0, 255, 136, 0.08)" : "rgba(0, 245, 255, 0.03)",
              border: browserListening ? "2px solid rgba(16,185,129,0.2)" : "1px solid var(--border)",
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
                  <span className="muted">Start speaking to see text here...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button 
          className={`btn ${browserListening ? 'btn-danger' : 'btn-primary'} btn-lg`} 
          onClick={startBrowserStt} 
          disabled={!browserSupported}
          style={{width:'100%', justifyContent:'center', marginTop:24}}
        >
          {browserListening ? (
            <><span style={{display:"inline-block", width:10, height:10, background:"#fff", borderRadius:"50%", animation:"pulse 1s infinite"}}></span> Stop Recording</>
          ) : (
            '🎤 Start Microphone'
          )}
        </button>
        
        {!browserSupported && (
          <div style={{
            marginTop:16, padding:12, borderRadius:10, 
            background:"rgba(239,68,68,0.08)", 
            border:"1px solid rgba(239,68,68,0.15)",
            textAlign:'center'
          }}>
            <p className="muted" style={{margin:0, fontSize:13, color:"#dc2626"}}>
              ⚠️ Your browser does not support the Web Speech API.
            </p>
          </div>
        )}

        {/* Server-side Transcription Option */}
        <div style={{
          marginTop: 24,
          padding: 20,
          background: "linear-gradient(135deg, rgba(191, 0, 255, 0.08), rgba(191, 0, 255, 0.02))",
          borderRadius: 16,
          border: "1px solid rgba(191, 0, 255, 0.2)"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
            <span style={{fontSize:20}}>🤖</span>
            <h4 style={{margin:0, fontSize:14}}>Server AI Transcription</h4>
            <span className="badge" style={{fontSize:10, background:"rgba(191,0,255,0.2)"}}>AssemblyAI</span>
          </div>
          <p className="muted" style={{fontSize:12, marginBottom:16}}>
            Record audio and transcribe using AssemblyAI for better accuracy and more language support.
          </p>
          
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            {!isRecording ? (
              <button 
                className="btn btn-primary btn-sm"
                onClick={startRecording}
                disabled={serverTranscribing}
                style={{background:"linear-gradient(135deg, #bf00ff, #ff00ff)"}}
              >
                🎙️ Record Audio
              </button>
            ) : (
              <button 
                className="btn btn-danger btn-sm"
                onClick={stopRecording}
              >
                ⏹️ Stop Recording
              </button>
            )}
            
            {recordedBlob && !isRecording && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={transcribeWithServer}
                disabled={serverTranscribing}
              >
                {serverTranscribing ? '⏳ Transcribing...' : '✨ Transcribe with AI'}
              </button>
            )}
          </div>
          
          {(isRecording || recordedBlob) && (
            <p className="muted" style={{fontSize:11, marginTop:10}}>
              {isRecording ? '🔴 Recording in progress...' : recordedBlob ? '✅ Audio recorded. Ready to transcribe.' : ''}
            </p>
          )}
        </div>
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
