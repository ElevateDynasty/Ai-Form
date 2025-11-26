import io
import os
from collections import OrderedDict

from gtts import gTTS

_CACHE: "OrderedDict[tuple[str, str], bytes]" = OrderedDict()
_CACHE_LIMIT = int(os.getenv("TTS_CACHE_LIMIT", "10"))


def _remember(key: tuple[str, str], value: bytes) -> bytes:
    _CACHE[key] = value
    _CACHE.move_to_end(key)
    while len(_CACHE) > _CACHE_LIMIT:
        _CACHE.popitem(last=False)
    return value


def synthesize_speech(text: str, lang: str = "en") -> bytes:
    if not text or not text.strip():
        raise ValueError("Text is required for speech synthesis")

    normalized = text.strip()
    cache_key = (normalized, lang)
    if cache_key in _CACHE:
        return _remember(cache_key, _CACHE[cache_key])

    speech = gTTS(text=normalized, lang=lang)
    buffer = io.BytesIO()
    speech.write_to_fp(buffer)
    buffer.seek(0)
    return _remember(cache_key, buffer.read())
