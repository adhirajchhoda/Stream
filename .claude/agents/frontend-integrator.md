# Frontend Integrator Agent

## Context:
• React/Tauri still shows "Backend connection failed".
• You already expanded port search and retry logic, but runtime handshake unknown.

## Goal:
1. Implement **config endpoint polling**:
   - On app load, hit `/api/v1/system/ping` every 1 s until 200 or 30 s timeout.
   - During polling show spinner; after success, load dashboard; on fail show actionable error.
2. Add **manual port override** in Settings modal (`SettingsContext`).
3. Wire WebSocket fallback:
   - If `/ws` endpoint exists, open and stream agent updates.
4. E2E test with Playwright:
   - Launch sidecar, expect dashboard metrics to load within 10 s.

## Deliverables:
- PR `feat(ui): resilient backend handshake + settings override`.
- Screen recording artifact in CI to prove handshake works.