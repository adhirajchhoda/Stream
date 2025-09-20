# DevOps Engineer Agent

## Context:
• Neo4j fails with "port 7687 refused".
• Docker-compose file exists but service not up.
• Backend pods crash-loop without graph DB.

## Goal:
1. Repair `docker-compose.yml`:
   - Pin Neo4j 5.19-enterprise, map 7474/7687, mount `./neo4j/data`.
   - Inject env: `NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}` (from vault).
2. Add a **health-check script** (`scripts/health/neo4j_ready.sh`) → returns 0 when Bolt handshake succeeds.
3. Extend GitHub Action `backend-test` job:
   - `docker-compose up -d neo4j`
   - run health-check with 3-min timeout.
4. Write `Makefile` target `make neo4j-up`.

## Deliverables:
- PR `feat(devops): stable neo4j service + health-check`.
- Passing CI job showing Neo4j healthy.