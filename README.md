# 🔴 PulseRelay — Emergency Voice-to-Triage Relay

**RescueHacks** | Real-time emergency triage from panicked caller audio

PulseRelay ingests fragmented, high-panic bystander speech, extracts structured incident telemetry in real time, and delivers it to dispatchers through two purpose-built interfaces.

---

## 🏗️ Architecture

```
┌──────────────────┐     WebSocket      ┌──────────────────┐     WebSocket      ┌──────────────────┐
│   Caller View    │ ──────────────────► │  FastAPI Backend │ ──────────────────► │ Dispatcher View  │
│ (Voice / Text)   │   transcript text   │  + Groq LLM API  │   triage JSON      │  (Triage Cards)  │
└──────────────────┘                     └──────────────────┘                     └──────────────────┘
        │                                        │
        │ Web Speech API                         │ POST /api/triage (REST)
        │ (browser-native)                       │
        └────────────────────────────────────────┘
```

## 🖥️ Two Interfaces

### Caller View (`/caller`)
- Ultra-minimalist, de-escalation design
- WCAG AAA contrast, massive tap targets
- Push-to-talk voice input with Web Speech API
- Live transcript display
- Fallback text input + 911 emergency fallback

### Dispatcher View (`/dispatcher`)
- High-density dark dashboard
- Real-time triage cards via WebSocket
- 4 Ws: Who, What, Where, Hazards
- Color-coded consciousness badges
- Incident history sidebar
- Summary statistics

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Groq API Key](https://console.groq.com/keys)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:
- **Caller View**: http://localhost:5173/caller
- **Dispatcher View**: http://localhost:5173/dispatcher

### Run Tests

```bash
# From project root
python -m pytest backend/tests/ -v
```

---

## 📂 Project Structure

```
PulseRelay/
├── backend/
│   ├── main.py                  # FastAPI app (REST + WebSocket)
│   ├── requirements.txt
│   ├── .env.example
│   ├── schemas/
│   │   └── triage.py            # Pydantic TriageResponse model
│   ├── services/
│   │   └── triage_service.py    # Groq LLM triage extractor
│   └── tests/
│       └── test_triage_service.py
├── frontend/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # React Router
│   │   ├── index.css            # Design system
│   │   ├── components/
│   │   │   ├── VoiceButton.jsx
│   │   │   └── TriageCard.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   └── useSpeechRecognition.js
│   │   └── pages/
│   │       ├── CallerView.jsx
│   │       └── DispatcherView.jsx
│   └── package.json
└── README.md
```

---

## 🛡️ Safety Guardrails

- **NON-DIAGNOSTIC**: The system never generates clinical diagnoses or medical advice.
- **TIMEOUT-SAFE**: Sub-3s LLM timeout with safe fallback objects.
- **ACCESSIBILITY FIRST**: WCAG AAA contrast, zero cognitive clutter.
- **OFFLINE FALLBACK**: Shows 911 emergency number if backend is unreachable.

---

## 📡 API Reference

### REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Service health check |
| `POST` | `/api/triage` | One-shot triage extraction |
| `GET`  | `/api/incidents` | Recent incident history |

### WebSocket

| Endpoint | Role | Description |
|----------|------|-------------|
| `ws://host:8000/ws/caller` | Caller | Send transcript text, receive triage result |
| `ws://host:8000/ws/dispatch` | Dispatcher | Receive live triage broadcasts |

---

## 🧪 Tech Stack

- **Frontend**: React 19 · Vite · Tailwind CSS 3 · Web Speech API
- **Backend**: FastAPI · Python · Groq SDK (Llama 3.3 70B)
- **Realtime**: WebSockets (native FastAPI)
