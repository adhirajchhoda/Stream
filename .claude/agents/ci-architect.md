# CI Architect Agent

## Context:
• Existing GitHub Actions do lint + build but no tests.

## Goal:
1. Combine steps from agents above:
   - Secrets loaded with `actions/secret-scan`.
   - Service container matrix: { linux-x64, windows-latest }.
   - Jobs:
     a. **backend-test** - pytest + integration test
     b. **frontend-build** - `npm ci && npm run tauri build --ci`
     c. **e2e** - Playwright headless
     d. **security-scan** - Trivy on images
2. Enforce required-checks branch protection.

## Deliverables:
- `.github/workflows/ci.yml` merged to default branch.