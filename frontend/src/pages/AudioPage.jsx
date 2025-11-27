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

// AssemblyAI Real-time WebSocket URL
const ASSEMBLYAI_REALTIME_URL = 'wss://api.assemblyai.com/v2/realtime/ws';

export default function AudioPage(){
  const { setVoiceText } = useAuth();
  const [browserSupported, setBrowserSupported] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [text, setText] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [sttLang, setSttLang] = useState('en');
  const [ttsLang, setTtsLang] = useState('en');
  const [sttStatus, setSttStatus] = useState('Ready');
  const [ttsStatus, setTtsStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Refs
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SpeechRecognition){ setBrowserSupported(true); }
    return ()=>{ 
      stopRecording();
    };
  }, []);

  // Get AssemblyAI token from backend
  const getRealtimeToken = async () => {
    try {
      const res = await fetch(`${API_BASE}/voice/realtime-token`);
      if (!res.ok) throw new Error('Failed to get token');
      const data = await res.json();
      return data.token;
    } catch (err) {
      console.error('Token error:', err);
      return null;
    }
  };

  // Start real-time streaming transcription
  const startRealtimeTranscription = async () => {
    setError('');
    setText('');
    setVoiceText('');
    setInterimTranscript('');
    setUsingFallback(false);
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;
      
      // Get real-time token
      const token = await getRealtimeToken();
      
      if (!token) {
        throw new Error('Could not get AssemblyAI token');
      }
      
      // Create WebSocket connection
      const socket = new WebSocket(`${ASSEMBLYAI_REALTIME_URL}?sample_rate=16000&token=${token}`);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setSttStatus('🎤 Live transcription active (AssemblyAI)');
        setIsRecording(true);
        
        // Set up audio processing
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (socket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = convertFloat32ToInt16(inputData);
            socket.send(pcmData.buffer);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.message_type === 'PartialTranscript') {
          setInterimTranscript(data.text || '');
        } else if (data.message_type === 'FinalTranscript') {
          if (data.text) {
            setText(prev => {
              const next = prev ? `${prev} ${data.text}`.trim() : data.text;
              setVoiceText(next);
              return next;
            });
            setInterimTranscript('');
          }
        }
      };
      
      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Real-time connection failed. Trying browser fallback...');
        stopRecording();
        // Fallback to browser STT
        if (browserSupported) {
          setTimeout(() => startBrowserStt(true), 500);
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket closed');
        if (isRecording) {
          setSttStatus('Connection closed');
        }
      };
      
    } catch (err) {
      console.error('Start error:', err);
      setError(`${err.message}. Trying browser fallback...`);
      // Fallback to browser STT
      if (browserSupported) {
        startBrowserStt(true);
      }
    }
  };

  // Convert Float32Array to Int16Array for AssemblyAI
  const convertFloat32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  // Stop recording
  const stopRecording = () => {
    // Close WebSocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ terminate_session: true }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop browser recognition if active
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
    setInterimTranscript('');
    if (text) {
      setSttStatus('✅ Transcription complete');
    } else {
      setSttStatus('Ready');
    }
  };

  // Browser STT fallback
  const startBrowserStt = (isFallback = false) => {
    if (isFallback) {
      setUsingFallback(true);
      setSttStatus('🔄 Fallback: Using browser recognition...');
    }
    
    if (!browserSupported) {
      setError('Browser speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = sttLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsRecording(true);
      setSttStatus(isFallback ? '🔄 Live transcription (Browser Fallback)' : '🎤 Live transcription (Browser)');
    };
    
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone blocked' : 'Browser STT error');
      stopRecording();
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let finalChunks = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunks.push(transcript);
        } else {
          interim += transcript;
        }
      }
      if (finalChunks.length) {
        setText(prev => {
          const next = `${prev} ${finalChunks.join(' ')}`.trim();
          setVoiceText(next);
          return next;
        });
      }
      setInterimTranscript(interim);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      setInterimTranscript('');
      setUsingFallback(false);
      setSttStatus('✅ Transcription complete');
    };
    
    recognition.start();
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRealtimeTranscription();
    }
  };

  // Browser-only mode
  const startBrowserOnly = () => {
    if (isRecording) {
      stopRecording();
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
              background: isRecording 
                ? "linear-gradient(135deg, #10b981, #059669)" 
                : "linear-gradient(135deg, var(--primary), var(--accent))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24,
              boxShadow: isRecording 
                ? "0 8px 24px rgba(16,185,129,0.3)" 
                : "0 8px 24px rgba(99,102,241,0.2)"
            }}>
              🎤
            </div>
            <div>
              <h3 className="section-title" style={{fontSize:18, margin:0}}>Voice to Text</h3>
              <p className="muted" style={{fontSize:12, margin:0}}>Live Streaming Transcription</p>
            </div>
          </div>
          <span className={`badge ${isRecording ? 'success animate-pulse' : ''}`} style={{padding:'8px 14px'}}>
            {isRecording ? '● Live' : 'Ready'}
          </span>
        </div>
        
        <p className="muted" style={{ marginBottom: 24, background:"linear-gradient(135deg, rgba(191, 0, 255, 0.08), rgba(0, 245, 255, 0.05))", padding:12, borderRadius:10, fontSize:13, border:"1px solid rgba(191, 0, 255, 0.15)" }}>
          🤖 <strong>Real-time transcription</strong> - See your words appear as you speak! Uses AssemblyAI with browser fallback.
        </p>
        
        {error && <div className="error" style={{marginBottom:16}}>⚠️ {error}</div>}
        
        {/* Status indicator */}
        <div style={{
          marginBottom: 16,
          padding: 10,
          borderRadius: 8,
          background: usingFallback 
            ? "rgba(245, 158, 11, 0.1)" 
            : sttStatus.includes('AssemblyAI') || sttStatus.includes('Live')
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
            <select value={sttLang} onChange={(e)=>setSttLang(e.target.value)} disabled={isRecording}>
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
              background: isRecording ? "rgba(0, 255, 136, 0.08)" : "rgba(0, 245, 255, 0.03)",
              border: isRecording ? "2px solid rgba(16,185,129,0.2)" : "1px solid var(--border)",
              transition: "all 0.3s ease"
            }}>
              {interimTranscript || text ? (
                <span>
                  {text}
                  {interimTranscript && <span style={{color:"var(--accent)", fontStyle:"italic", opacity:0.8}}> {interimTranscript}</span>}
                </span>
              ) : (
                <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, opacity:0.5}}>
                  <span style={{fontSize:32}}>🎙️</span>
                  <span className="muted">Click record to start live transcription...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Record Button */}
        <button 
          className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'} btn-lg`} 
          onClick={toggleRecording}
          style={{width:'100%', justifyContent:'center', marginTop:24, background: !isRecording ? "linear-gradient(135deg, #bf00ff, #ff00ff)" : undefined}}
        >
          {isRecording ? (
            <><span style={{display:"inline-block", width:10, height:10, background:"#fff", borderRadius:"50%", animation:"pulse 1s infinite"}}></span> Stop Recording</>
          ) : (
            '🎤 Start Live Transcription'
          )}
        </button>

        {/* Browser-only option */}
        <div style={{marginTop: 16, display: "flex", gap: 10, justifyContent: "center"}}>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={startBrowserOnly}
            disabled={!browserSupported}
            style={{fontSize: 12}}
          >
            {isRecording && usingFallback ? '⏹️ Stop' : '🌐 Use Browser Only'}
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
