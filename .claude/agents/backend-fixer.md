# Backend Fixer Agent

## Context:
• Flask (knowledge graph) and FastAPI (main) fail because SQLite path resolves incorrectly; relative path `../shared/database/octane.db` breaks when launched by Tauri sidecar.
• Env var `DATABASE_PATH` already exists.

## Goal:
1. In `backend/common/config.py` add helper `resolve_db_path()`:
   ```python
   def resolve_db_path():
       p = Path(os.getenv("DATABASE_PATH", "shared/database/octane.db")).expanduser()
       if not p.is_absolute():
           p = (Path(__file__).parent.parent.parent / p).resolve()
       p.parent.mkdir(parents=True, exist_ok=True)
       return str(p)
   ```
2. Update both Flask and FastAPI to call this resolver.
3. Add migration step: if DB missing, auto-create schema (alembic upgrade head or raw SQL).
4. Write integration test `tests/api/test_health.py`:
   ```python
   def test_health():
       resp = requests.get("http://localhost:8080/api/v1/system/health")
       assert resp.status_code == 200
       assert resp.json()["data"]["status"] == "healthy"
   ```
   – executed in CI after `docker-compose up -d neo4j api flask`.
5. Bump version to 0.2.0 in `backend/__init__.py`.

## Deliverables:
- PR `fix(api): robust DB path resolution + health test`.
- CI green.