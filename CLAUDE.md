# 001-slop-video-generator Development Guidelines

Auto-generated from feature plan. Last updated: 2025-11-26

## Active Technologies

- **Frontend**: TypeScript 5.x, React 18, Vite 5, Tailwind CSS 3
- **Backend**: Python 3.11+, FastAPI, FFmpeg
- **Deployment**: GitHub Pages (frontend), Cloud Run (backend)

## Project Structure

```
frontend/                    # Vite + React SPA
├── src/
│   ├── components/          # React components by feature area
│   ├── contexts/            # React Context state management
│   ├── services/            # API client functions (LLM, TTS, images)
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript interfaces
├── tests/
└── package.json

backend/                     # FastAPI + FFmpeg
├── src/
│   ├── routes/              # API endpoints
│   ├── services/            # FFmpeg video assembly
│   └── models/              # Pydantic schemas
├── tests/
└── requirements.txt

kitty-specs/001-slop-video-generator/   # Feature documentation
├── spec.md                  # Feature specification
├── plan.md                  # Implementation plan
├── research.md              # API research findings
├── data-model.md            # Entity definitions
├── contracts/               # OpenAPI specs
└── quickstart.md            # Dev setup guide
```

## Commands

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript checks
npm run test:e2e         # Run Playwright e2e tests
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000   # Dev server
pytest                   # Run tests
```

## Code Style

- **TypeScript**: Strict mode, functional components, React hooks
- **Python**: Type hints, Pydantic models, async/await
- **Tailwind**: Utility classes, no custom CSS unless necessary

## Architecture Notes

- API calls (OpenAI, ElevenLabs, DeepSeek) made directly from browser
- Backend handles only FFmpeg video assembly
- State managed via React Context (ConfigContext, SceneContext, AssetContext, WorkflowContext)
- Streaming LLM responses parsed with native fetch + ReadableStream

## Key Implementation Details

- OpenAI streaming uses SSE format (`data: {...}\n\n`)
- ElevenLabs TTS uses `previous_text`/`next_text` for natural transitions
- Image brightness correction done client-side with Canvas API
- Video assembly receives images + audio via multipart form

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
