# Stream Protocol Security Playbook

## 🔐 **Overview**

This playbook documents Stream Protocol's comprehensive security practices, secret management procedures, and incident response protocols. **Every team member must read and follow these procedures.**

---

## 📋 **Table of Contents**

1. [Secret Management](#secret-management)
2. [Environment Configuration](#environment-configuration)
3. [Key Rotation Procedures](#key-rotation-procedures)
4. [CI/CD Security](#cicd-security)
5. [Incident Response](#incident-response)
6. [Security Monitoring](#security-monitoring)
7. [Compliance Framework](#compliance-framework)

---

## 🔑 **Secret Management**

### **Core Principles**

1. **NEVER commit secrets to git** - No exceptions
2. **Use environment-specific secrets** - Dev/staging/prod must be different
3. **Rotate secrets quarterly** - All secrets have expiration dates
4. **Principle of least privilege** - Only grant necessary access
5. **Audit all access** - Log who accessed what and when

### **Secret Storage Hierarchy**

| **Environment** | **Storage Method** | **Security Level** | **Access Control** |
|-----------------|-------------------|-------------------|-------------------|
| **Local Development** | `.env.development` file | 🟡 **Medium** | Developer workstation |
| **CI/Testing** | GitHub Secrets | 🟢 **High** | Repository access |
| **Staging** | HashiCorp Vault | 🔴 **Very High** | Role-based access |
| **Production** | HashiCorp Vault + HSM | 🟣 **Maximum** | Multi-factor auth |

### **Secret Types and Requirements**

| **Secret Type** | **Format** | **Rotation Frequency** | **Storage Method** |
|----------------|------------|----------------------|-------------------|
| **Private Keys** | 0x[64-char hex] | 90 days | Vault + HSM |
| **API Keys** | sk_[32-char] | 30 days | Vault |
| **JWT Secrets** | [64-char base64] | 60 days | Vault |
| **Database Passwords** | [32-char random] | 90 days | Vault |
| **Encryption Keys** | [32-byte key] | 180 days | Vault + HSM |

---

## ⚙️ **Environment Configuration**

### **Development Setup**

1. **Copy template files:**
   ```bash
   cp .env.template .env.development
   cp attestation-service/.env.template attestation-service/.env.development
   ```

2. **Generate development secrets:**
   ```bash
   # Generate private key
   openssl rand -hex 32

   # Generate JWT secret
   openssl rand -base64 64

   # Generate encryption key
   openssl rand -base64 32
   ```

3. **Update .env.development with real values:**
   ```bash
   PRIVATE_KEY=0x1234567890abcdef...
   JWT_SECRET=AbCdEf123456...
   ENCRYPTION_KEY=XyZ789...
   ```

4. **Verify .env.development is git-ignored:**
   ```bash
   git check-ignore .env.development
   # Should return: .env.development
   ```

### **Staging/Production Setup**

1. **Initialize Vault connection:**
   ```bash
   export VAULT_ADDR=https://vault.stream-protocol.com
   export VAULT_TOKEN=your_vault_token
   node scripts/secrets/vault-manager.js init
   ```

2. **Store secrets in Vault:**
   ```bash
   node scripts/secrets/vault-manager.js set private_key
   node scripts/secrets/vault-manager.js set jwt_secret
   node scripts/secrets/vault-manager.js set database_password
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.vault.yml up -d
   ```

---

## 🔄 **Key Rotation Procedures**

### **Quarterly Rotation Schedule**

| **Quarter** | **Secrets to Rotate** | **Lead** | **Backup** |
|-------------|----------------------|----------|------------|
| **Q1** | Private keys, API keys | DevOps Lead | Security Engineer |
| **Q2** | Database passwords, JWT secrets | Backend Lead | DevOps Lead |
| **Q3** | Encryption keys, HSM keys | Security Engineer | Backend Lead |
| **Q4** | All secrets (annual rotation) | Security Engineer | DevOps Lead |

### **Rotation Procedure**

#### **Preparation (T-7 days)**

1. **Schedule maintenance window:**
   - [ ] Notify all stakeholders
   - [ ] Schedule 2-hour window
   - [ ] Prepare rollback plan

2. **Pre-rotation verification:**
   ```bash
   # Health check all services
   node scripts/secrets/vault-manager.js health

   # Verify current secret access
   node scripts/secrets/vault-manager.js list

   # Backup current configuration
   kubectl get secrets -o yaml > secrets-backup-$(date +%Y%m%d).yaml
   ```

#### **Execution (T-Day)**

1. **Generate new secrets:**
   ```bash
   # Rotate private key
   node scripts/secrets/vault-manager.js rotate private_key

   # Rotate JWT secret
   node scripts/secrets/vault-manager.js rotate jwt_secret

   # Rotate database password
   node scripts/secrets/vault-manager.js rotate database_password
   ```

2. **Update services (rolling restart):**
   ```bash
   # Restart attestation service
   docker-compose restart attestation-service

   # Verify health
   curl -f http://localhost:3001/health

   # Update database connection
   kubectl rollout restart deployment/postgres
   ```

3. **Verify rotation success:**
   ```bash
   # Test API endpoints
   curl -H "Authorization: Bearer $(get_jwt_token)" http://localhost:3001/api/health

   # Test database connectivity
   npm run test:db-connection

   # Test ZKP generation
   npm run test:zkp-circuit
   ```

#### **Post-Rotation (T+1 day)**

1. **Security verification:**
   ```bash
   # Verify old secrets are invalidated
   test_old_secrets.sh

   # Audit access logs
   grep "authentication" /var/log/attestation/*.log

   # Update documentation
   git commit -m "docs: update rotation completion date"
   ```

### **Emergency Rotation (Compromised Secrets)**

If a secret is compromised, execute **immediate rotation**:

1. **Immediate containment (< 15 minutes):**
   ```bash
   # Revoke compromised secret
   node scripts/secrets/vault-manager.js revoke <secret_name>

   # Generate emergency replacement
   node scripts/secrets/vault-manager.js set <secret_name> --emergency

   # Restart affected services
   docker-compose restart attestation-service
   ```

2. **Impact assessment (< 1 hour):**
   - [ ] Review access logs for unauthorized usage
   - [ ] Identify affected user accounts
   - [ ] Check for data exfiltration
   - [ ] Document timeline of compromise

3. **Recovery and hardening (< 24 hours):**
   - [ ] Complete full rotation of related secrets
   - [ ] Update access controls and policies
   - [ ] Implement additional monitoring
   - [ ] Conduct post-incident review

---

## 🚀 **CI/CD Security**

### **Secret Detection in CI**

Every CI/CD pipeline **MUST** include secret detection:

```yaml
# .github/workflows/security-check.yml
name: Security Check
on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Secret Detection
        run: |
          # Detect common secret patterns
          if grep -r -E "(AIZ[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{36}|sk-[a-zA-Z0-9]{48})" . --exclude-dir=.git; then
            echo "❌ SECRETS DETECTED IN CODE"
            exit 1
          fi

          # Detect private keys
          if grep -r -E "(BEGIN.*PRIVATE.*KEY|0x[a-fA-F0-9]{64})" . --exclude-dir=.git; then
            echo "❌ PRIVATE KEYS DETECTED"
            exit 1
          fi

          echo "✅ No secrets detected"

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Audit Dependencies
        run: |
          npm audit --audit-level=moderate

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Scan Image
        run: |
          docker build -t stream-security-scan .
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            -v $(pwd):/app aquasec/trivy image stream-security-scan
```

### **Secure Deployment Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Secure Deploy
on:
  push:
    branches: [main]

jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Secret Scan (BLOCKING)
        run: ./scripts/security/secret-scan.sh

      - name: Vulnerability Scan (BLOCKING)
        run: ./scripts/security/vulnerability-scan.sh

      - name: Code Quality Gate (BLOCKING)
        run: ./scripts/security/quality-gate.sh

  deploy:
    needs: security-gate
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy with Vault Integration
        env:
          VAULT_TOKEN: ${{ secrets.VAULT_TOKEN }}
        run: |
          # Fetch secrets from Vault at deployment time
          export DATABASE_URL=$(vault kv get -field=value secret/stream-protocol/database_url)

          # Deploy with injected secrets
          docker-compose -f docker-compose.vault.yml up -d
```

---

## 🚨 **Incident Response**

### **Security Incident Classification**

| **Severity** | **Examples** | **Response Time** | **Escalation** |
|-------------|--------------|-------------------|----------------|
| **P0 - Critical** | Private key compromise, active breach | < 15 minutes | CEO, CTO, Legal |
| **P1 - High** | API key exposure, unauthorized access | < 1 hour | CTO, Security Lead |
| **P2 - Medium** | Dependency vulnerability, config issue | < 4 hours | Security Lead, DevOps |
| **P3 - Low** | Documentation gap, minor exposure | < 24 hours | Development Team |

### **Incident Response Playbook**

#### **Detection and Analysis (0-30 minutes)**

1. **Immediate assessment:**
   ```bash
   # Check system status
   kubectl get pods --all-namespaces

   # Review security logs
   tail -f /var/log/security.log

   # Check vault status
   vault status
   ```

2. **Threat identification:**
   - [ ] Source of compromise identified
   - [ ] Scope of impact assessed
   - [ ] Affected systems catalogued
   - [ ] Data exposure evaluated

#### **Containment (30-60 minutes)**

1. **Immediate containment:**
   ```bash
   # Isolate affected systems
   kubectl cordon <affected-node>

   # Revoke compromised credentials
   node scripts/secrets/vault-manager.js revoke <compromised-secret>

   # Enable emergency monitoring
   kubectl apply -f emergency-monitoring.yaml
   ```

2. **Evidence preservation:**
   ```bash
   # Capture system state
   kubectl get events --all-namespaces > incident-events.log

   # Backup affected databases
   pg_dump --clean --create stream_attestations > incident-db-backup.sql

   # Preserve log files
   tar -czf incident-logs-$(date +%Y%m%d).tar.gz /var/log/
   ```

#### **Eradication and Recovery (1-6 hours)**

1. **Root cause elimination:**
   - [ ] Vulnerability patched
   - [ ] Malicious code removed
   - [ ] Access controls updated
   - [ ] Monitoring enhanced

2. **System recovery:**
   ```bash
   # Deploy clean environment
   kubectl apply -f recovery-deployment.yaml

   # Restore from clean backup
   psql stream_attestations < clean-backup.sql

   # Rotate all potentially affected secrets
   ./scripts/security/emergency-rotation.sh
   ```

#### **Post-Incident Activities (24-72 hours)**

1. **Post-incident review:**
   - [ ] Timeline documented
   - [ ] Root cause identified
   - [ ] Lessons learned captured
   - [ ] Improvements implemented

2. **Stakeholder communication:**
   - [ ] Internal report completed
   - [ ] User notification sent (if required)
   - [ ] Regulatory filing submitted (if required)
   - [ ] Documentation updated

---

## 📊 **Security Monitoring**

### **Key Security Metrics**

| **Metric** | **Target** | **Alert Threshold** | **Monitoring Tool** |
|------------|------------|-------------------|-------------------|
| **Failed Login Attempts** | < 5/minute | > 10/minute | Prometheus |
| **API Rate Limit Violations** | < 1/hour | > 5/hour | Prometheus |
| **Vault Authentication Failures** | 0 | > 0 | Vault Audit Log |
| **Certificate Expiration** | > 30 days | < 7 days | Custom Script |
| **Dependency Vulnerabilities** | 0 critical | > 0 critical | Snyk |

### **Monitoring Setup**

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

rule_files:
  - "security-rules.yml"

scrape_configs:
  - job_name: 'stream-attestation'
    static_configs:
      - targets: ['attestation-service:3001']
    metrics_path: '/metrics'

  - job_name: 'vault'
    static_configs:
      - targets: ['vault:8200']
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
```

### **Security Alerts**

```yaml
# monitoring/security-rules.yml
groups:
  - name: security-alerts
    rules:
      - alert: HighLoginFailureRate
        expr: rate(failed_logins_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High login failure rate detected"

      - alert: VaultDown
        expr: up{job="vault"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "HashiCorp Vault is down"

      - alert: UnauthorizedAPIAccess
        expr: rate(unauthorized_requests_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Unauthorized API access attempts detected"
```

---

## 📜 **Compliance Framework**

### **Regulatory Requirements**

| **Regulation** | **Requirements** | **Implementation** | **Verification** |
|---------------|------------------|-------------------|------------------|
| **SOC 2** | Access controls, monitoring | Vault + RBAC | Annual audit |
| **PCI DSS** | Encryption, key management | HSM + TLS | Quarterly scan |
| **GDPR** | Data protection, breach notification | Encryption + monitoring | Privacy impact assessment |
| **SOX** | Internal controls, documentation | Change management + audit logs | External audit |

### **Security Controls Matrix**

| **Control ID** | **Description** | **Implementation** | **Testing Frequency** |
|---------------|----------------|-------------------|---------------------|
| **AC-01** | Access Control Policy | Vault RBAC | Quarterly |
| **AC-02** | Account Management | Automated provisioning | Monthly |
| **AC-03** | Access Enforcement | Multi-factor authentication | Continuous |
| **AU-02** | Audit Events | Comprehensive logging | Daily |
| **AU-03** | Audit Record Content | Structured log format | Weekly |
| **CP-01** | Contingency Planning | Disaster recovery procedures | Semi-annually |
| **IA-02** | User Identification | Strong authentication | Continuous |
| **SC-07** | Boundary Protection | Network segmentation + firewall | Monthly |

---

## 🔧 **Tools and Scripts**

### **Required Tools**

```bash
# Install security tools
npm install -g @security/scanner
pip install bandit safety
go install github.com/trufflesecurity/trufflehog/v3@latest

# Vault CLI
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault

# Docker security scanning
docker pull aquasec/trivy
```

### **Security Scripts**

1. **Daily Security Check:**
   ```bash
   #!/bin/bash
   # scripts/security/daily-check.sh

   # Check for exposed secrets
   ./scripts/security/secret-scan.sh

   # Scan dependencies
   npm audit --audit-level=moderate

   # Check certificate expiration
   ./scripts/security/cert-check.sh

   # Verify vault health
   vault status
   ```

2. **Weekly Security Report:**
   ```bash
   #!/bin/bash
   # scripts/security/weekly-report.sh

   # Generate security metrics
   ./scripts/monitoring/generate-security-metrics.sh

   # Review access logs
   ./scripts/analysis/analyze-access-logs.sh

   # Check compliance status
   ./scripts/compliance/compliance-check.sh
   ```

---

## 📚 **Training and Awareness**

### **Required Training**

| **Role** | **Training Required** | **Frequency** | **Certification** |
|----------|----------------------|---------------|------------------|
| **Developers** | Secure coding, secret management | Quarterly | Internal cert |
| **DevOps** | Infrastructure security, incident response | Bi-annually | External cert |
| **Security** | Advanced threat detection, compliance | Annually | Professional cert |
| **Management** | Security governance, risk management | Annually | Executive briefing |

### **Security Awareness Topics**

1. **Secret Management Best Practices**
2. **Phishing and Social Engineering**
3. **Secure Development Lifecycle**
4. **Incident Response Procedures**
5. **Compliance Requirements**
6. **Third-Party Risk Management**

---

## 📞 **Emergency Contacts**

| **Role** | **Primary** | **Backup** | **Escalation** |
|----------|-------------|------------|----------------|
| **Security Lead** | security@stream-protocol.io | +1-555-SEC-LEAD | CTO |
| **DevOps Lead** | devops@stream-protocol.io | +1-555-DEV-OPS | Security Lead |
| **Legal Counsel** | legal@stream-protocol.io | +1-555-LEGAL-1 | General Counsel |
| **External Security** | incident@security-firm.com | +1-555-EXT-SEC | Security Lead |

---

## ✅ **Security Checklist**

### **Daily**
- [ ] Review security alerts and monitoring dashboards
- [ ] Check vault health and audit logs
- [ ] Verify backup integrity
- [ ] Monitor certificate expiration dates

### **Weekly**
- [ ] Run dependency vulnerability scans
- [ ] Review access control changes
- [ ] Analyze security metrics and trends
- [ ] Update threat intelligence feeds

### **Monthly**
- [ ] Conduct penetration testing
- [ ] Review and update security policies
- [ ] Test incident response procedures
- [ ] Audit user access and permissions

### **Quarterly**
- [ ] Rotate secrets according to schedule
- [ ] Conduct security awareness training
- [ ] Review compliance status
- [ ] Update disaster recovery plans

---

**This playbook is a living document. It must be reviewed and updated quarterly to reflect new threats, technologies, and business requirements.**

**Last Updated:** $(date +%Y-%m-%d)
**Next Review:** $(date -d "+3 months" +%Y-%m-%d)
**Document Owner:** Security Team
**Approved By:** CTO, Security Lead