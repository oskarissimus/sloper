# Run backend dev server
run-backend:
    cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000

# Run frontend dev server
run-frontend:
    cd frontend && npm run dev
