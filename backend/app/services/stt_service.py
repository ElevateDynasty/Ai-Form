"""
AssemblyAI Speech-to-Text Service
Provides audio transcription using AssemblyAI API
"""
import os
import io
import requests
from typing import Optional

try:
    import assemblyai as aai
    ASSEMBLYAI_AVAILABLE = True
except ImportError:
    ASSEMBLYAI_AVAILABLE = False
    aai = None


def get_realtime_token() -> str:
    """
    Get a temporary authentication token for AssemblyAI real-time transcription.
    
    Returns:
        Temporary token string for WebSocket authentication
    """
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    
    if not api_key:
        raise ValueError("ASSEMBLYAI_API_KEY not configured")
    
    try:
        response = requests.post(
            "https://api.assemblyai.com/v2/realtime/token",
            headers={"authorization": api_key},
            json={"expires_in": 3600}  # Token valid for 1 hour
        )
        
        if response.status_code != 200:
            raise ValueError(f"Failed to get token: {response.text}")
        
        data = response.json()
        return data.get("token", "")
        
    except requests.RequestException as e:
        raise ValueError(f"Token request failed: {str(e)}")


def transcribe_audio(audio_bytes: bytes, language_code: Optional[str] = None) -> dict:
    """
    Transcribe audio using AssemblyAI API.
    
    Args:
        audio_bytes: Raw audio bytes (WAV, MP3, etc.)
        language_code: Optional language code (e.g., 'en', 'hi', 'es')
    
    Returns:
        dict with 'text' (transcription) and 'confidence' (if available)
    """
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    
    if not api_key:
        raise ValueError("ASSEMBLYAI_API_KEY not configured")
    
    if not ASSEMBLYAI_AVAILABLE:
        raise ValueError("assemblyai package not installed")
    
    try:
        # Configure AssemblyAI
        aai.settings.api_key = api_key
        
        # Create transcriber with config
        config = aai.TranscriptionConfig(
            language_code=language_code if language_code else "en",
            punctuate=True,
            format_text=True,
        )
        
        transcriber = aai.Transcriber()
        
        # Transcribe from bytes
        transcript = transcriber.transcribe(io.BytesIO(audio_bytes), config=config)
        
        if transcript.status == aai.TranscriptStatus.error:
            raise ValueError(f"Transcription failed: {transcript.error}")
        
        return {
            "text": transcript.text or "",
            "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None,
            "words": [
                {"text": w.text, "start": w.start, "end": w.end, "confidence": w.confidence}
                for w in (transcript.words or [])
            ] if transcript.words else [],
            "status": "completed"
        }
        
    except Exception as e:
        raise ValueError(f"Transcription error: {str(e)}")


def get_supported_languages() -> list:
    """Return list of supported language codes for transcription."""
    return [
        {"code": "en", "name": "English"},
        {"code": "en_au", "name": "English (Australia)"},
        {"code": "en_uk", "name": "English (UK)"},
        {"code": "en_us", "name": "English (US)"},
        {"code": "es", "name": "Spanish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "it", "name": "Italian"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "nl", "name": "Dutch"},
        {"code": "hi", "name": "Hindi"},
        {"code": "ja", "name": "Japanese"},
        {"code": "zh", "name": "Chinese"},
        {"code": "ko", "name": "Korean"},
        {"code": "ru", "name": "Russian"},
        {"code": "ar", "name": "Arabic"},
    ]
