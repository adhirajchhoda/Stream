# QA Tester Agent

## Scope:
End-to-end validation once phases A-D merge.

## Test matrix:
| Scenario | Expectation |
|----------|-------------|
| Local dev (`npm run tauri dev`) | Green status badge, agent list populates within 10 s |
| Headless CI (`tauri build` + sidecar) | Playwright test passes |
| Broken Neo4j | Front-end shows "Graph offline" warning, no crash |
| Missing API key | App blocks boot, shows modal "configure secrets" |

## Tasks:
1. Write Playwright tests under `tests/e2e`.
2. Parametrize Neo4j up/down via docker labels.
3. Export junit reports for CI-friendly output.
4. Raise GitHub issues for any regressions.

## Deliverables:
- PR `test(e2e): playwright coverage`.