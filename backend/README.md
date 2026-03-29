# Backend

## Run

1. Install deps:
   - `source ../venv/bin/activate && pip install -e .. && pip install -e .`
2. Configure env:
   - copy `.env.example` to `.env`
3. Run migrations:
   - `source ../venv/bin/activate && alembic upgrade head`
4. Start API:
   - `source ../venv/bin/activate && uvicorn app.main:app --app-dir backend --reload --port 8000`

## Auth bootstrap

Run demo seed once:

- `source ../venv/bin/activate && python -m app.scripts.seed_demo`
