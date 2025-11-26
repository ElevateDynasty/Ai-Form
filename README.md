# AI Universal Form Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![Node](https://img.shields.io/badge/node-16+-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**An intelligent form processing platform with OCR, voice input, and AI-powered text processing.**

[Features](#-key-features) • [Quick Start](#-getting-started) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 📄 **OCR Extraction** | Extract structured fields from PDFs and images automatically |
| 🎤 **Voice Input** | Browser-based speech-to-text for hands-free form filling |
| 🔊 **Text-to-Speech** | Convert text to natural audio in multiple languages |
| 🤖 **AI Text Processing** | Clean, summarize, and extract key phrases using tinyBART |
| 📝 **Visual Form Builder** | Admin interface to create and manage form templates |
| 📑 **PDF Auto-Fill** | Merge JSON data with fillable PDF templates |
| ♿ **Accessibility Mode** | High-contrast UI with enhanced voice navigation |

## 🏗️ Architecture

```
AI-FORM/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py            # API routes & startup
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── db.py              # Database configuration
│   │   └── services/          # Service modules
│   │       ├── ocr_service.py    # Document parsing
│   │       ├── tts_service.py    # Text-to-speech
│   │       ├── bart_service.py   # AI text processing
│   │       ├── pdf_service.py    # PDF operations
│   │       └── llm_service.py    # LLM integrations
│   └── requirements.txt
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx            # Main layout & routing
│   │   ├── pages/             # Page components
│   │   │   ├── OCRPage.jsx       # Document extraction
│   │   │   ├── AudioPage.jsx     # Voice features
│   │   │   ├── FormsPage.jsx     # Form filling workspace
│   │   │   ├── LLMPage.jsx       # AI text tools
│   │   │   ├── PdfFillPage.jsx   # PDF merging
│   │   │   ├── AdminFormsPage.jsx # Template management
│   │   │   └── Login.jsx         # Authentication
│   │   └── styles.css         # Global design system
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 16+** with npm
- Modern browser (Chrome/Edge recommended for voice features)

### Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

📍 API available at `http://localhost:8000`  
📖 Interactive docs at `http://localhost:8000/docs`

### Frontend Setup

```powershell
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

📍 App available at `http://localhost:5173`

## 📡 API Reference

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |

### Document Processing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ocr/extract` | POST | Extract fields from PDF/image |
| `/api/pdf/fill` | POST | Fill PDF template with JSON data |

### Voice & Audio

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice/speak` | POST | Convert text to speech audio |
| `/api/voice/transcribe` | POST | ⚠️ Deprecated (use browser API) |

### AI Text Processing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llm/clean` | POST | Clean and normalize text |
| `/api/llm/summarize` | POST | Summarize long text |
| `/api/llm/key_phrases` | POST | Extract key phrases |

### Form Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/forms` | GET | - | List all form templates |
| `/api/forms` | POST | Admin | Create new template |
| `/api/forms/{id}` | PUT | Admin | Update template |
| `/api/forms/{id}` | DELETE | Admin | Delete template |
| `/api/forms/ingest` | POST | Admin | Generate schema from document |
| `/api/forms/{id}/responses` | POST | User | Submit form response |
| `/api/forms/{id}/responses/{rid}/download` | GET | User | Download response as JSON |
| `/api/forms/{id}/responses/{rid}/pdf` | GET | User | Download response as PDF |

### Example: OCR Extraction

```bash
curl -X POST "http://localhost:8000/api/ocr/extract" \
  -F "file=@document.pdf"
```

### Example: PDF Fill

```bash
curl -X POST "http://localhost:8000/api/pdf/fill" \
  -F "file=@template.pdf" \
  -F "field_values=@data.json" \
  --output filled_form.pdf
```

## 🎨 UI Features

### Design System
- Modern gradient backgrounds with glass morphism effects
- Responsive grid layouts for all screen sizes
- Animated transitions and loading states
- Badge system for status indicators

### Accessibility Mode
Toggle high-contrast mode for improved visibility:
- Dark theme with enhanced contrast
- Larger fonts and spacing
- Clear focus indicators
- Screen reader optimizations

### Voice Commands
In the Forms workspace, use natural commands:
- *"Set email to john@example.com"*
- *"Fill name as John Smith"*
- *"Add phone number 555-1234"*

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=sqlite:///./backend_data.db

# CORS (production)
ALLOWED_ORIGINS=https://yourdomain.com

# Optional: External API keys
# OPENAI_API_KEY=your-key-here
```

### Service Integration

The services in `backend/app/services/` are designed to be swappable:

| Service | Current | Upgrade Options |
|---------|---------|-----------------|
| OCR | PyPDF2 + basic parsing | Tesseract, Google Vision, AWS Textract |
| TTS | gTTS | Azure Speech, ElevenLabs |
| AI/LLM | tinyBART (local) | OpenAI GPT, Anthropic Claude |
| STT | Browser Web Speech API | Whisper, Azure Speech |

## 🧪 Development

### Project Structure

```
backend/app/services/
├── ocr_service.py      # Document parsing & field extraction
├── tts_service.py      # Text-to-speech generation
├── stt_service.py      # Speech-to-text (browser API info)
├── bart_service.py     # tinyBART for text processing
├── llm_service.py      # LLM integration layer
└── pdf_service.py      # PDF form filling with PyPDF2
```

### Running Tests

```powershell
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Python: Follow PEP 8
- JavaScript: ESLint + Prettier
- Commits: Conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

For questions, feature requests, or issues, please [open an issue](../../issues) on GitHub.

---

<div align="center">

Made with ❤️ for accessible form processing

</div>
