import logging
from typing import Optional

try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    BART_AVAILABLE = True
except ImportError:
    BART_AVAILABLE = False
    logging.warning("transformers not installed; BART features disabled")

logger = logging.getLogger(__name__)

_model = None
_tokenizer = None
MODEL_NAME = "sshleifer/tiny_mBART"


def _load_model():
    global _model, _tokenizer, BART_AVAILABLE
    if _model is None and BART_AVAILABLE:
        try:
            logger.info(f"Loading {MODEL_NAME}...")
            _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
            logger.info("BART model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load BART model: {e}")
            BART_AVAILABLE = False
    return _model, _tokenizer


def summarize_text(text: str, max_length: int = 50) -> str:
    """Summarize input text using tinyBART."""
    if not text or len(text.strip()) < 10:
        return text
    
    model, tokenizer = _load_model()
    if not model or not tokenizer:
        logger.warning("BART unavailable; returning original text")
        return text
    
    try:
        inputs = tokenizer(text, return_tensors="pt", max_length=1024, truncation=True)
        summary_ids = model.generate(
            inputs["input_ids"],
            max_length=max_length,
            num_beams=2,
            early_stopping=True
        )
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary.strip()
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return text


def clean_transcription(text: str) -> str:
    """Clean and correct OCR/voice transcription text using tinyBART."""
    if not text or len(text.strip()) < 5:
        return text
    
    model, tokenizer = _load_model()
    if not model or not tokenizer:
        logger.warning("BART unavailable; returning original text")
        return text
    
    try:
        prompt = f"Correct this text: {text}"
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        output_ids = model.generate(
            inputs["input_ids"],
            max_length=150,
            num_beams=2,
            early_stopping=True
        )
        cleaned = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        return cleaned.strip()
    except Exception as e:
        logger.error(f"Transcription cleaning error: {e}")
        return text


def extract_key_phrases(text: str, num_phrases: int = 5) -> list:
    """Extract key phrases from long text (simplified using BART)."""
    if not text or len(text.strip()) < 20:
        return []
    
    model, tokenizer = _load_model()
    if not model or not tokenizer:
        logger.warning("BART unavailable; returning empty")
        return []
    
    try:
        prompt = f"Extract main topics from: {text[:500]}"
        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        output_ids = model.generate(inputs["input_ids"], max_length=100, num_beams=2)
        output = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        phrases = [p.strip() for p in output.split(",") if p.strip()]
        return phrases[:num_phrases]
    except Exception as e:
        logger.error(f"Key phrase extraction error: {e}")
        return []
