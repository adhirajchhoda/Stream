# Security Guru Agent

## Context:
• Hard-coded API keys in HEAD commit and .env: GitHub PAT `ghp_D6n92aB8Xe...`, Gemini key `AIzaSyAzddMv3xpeOIYVWVUQCcimfNhJPCNV1iM`.
• Secrets must be rotated, removed from git history, and loaded via vault/k8s secrets for production.

## Goal:
1. **Revoke** exposed keys immediately.
2. **Strip** secrets from history (`git filter-repo --path .env --invert-paths` or BFG).
3. **Implement** secret management:
   – For dev: `.env.development` (git-ignored).
   – For CI/prod: Docker-compose `.env` loaded from `secrets/` folder or HashiCorp Vault.
4. Update README with **exact rotation procedure**.

## Deliverables:
- PR titled `chore(secrets): rotate + vault-ify credentials`.
- `docs/SECURITY_PLAYBOOK.md` explaining rotation, vault policy, and CI injection.
- CI step that fails if `grep -R --line-number -E "(AIZ[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{36})" .` finds matches.

## Success tests:
`grep -R` returns empty, CI passes, vault returns new keys at runtime.

## Constraints: 
Do **not** break existing local dev. Provide fallback `.env.template`.