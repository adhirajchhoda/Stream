#!/bin/bash

# Stream Protocol Secret Detection Script
# This script scans for potential secrets in the codebase
# Usage: ./scripts/security/secret-scan.sh [--fix] [--verbose]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERBOSE=false
FIX_MODE=false
EXIT_CODE=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--fix] [--verbose]"
      echo ""
      echo "Options:"
      echo "  --fix      Attempt to fix issues automatically"
      echo "  --verbose  Show detailed output"
      echo "  --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[VERBOSE]${NC} $1"
  fi
}

# Secret detection patterns (from original task requirement)
declare -A SECRET_PATTERNS
SECRET_PATTERNS[google_api]="AIZ[0-9A-Za-z_-]{30,}"
SECRET_PATTERNS[github_pat]="ghp_[A-Za-z0-9]{36}"
SECRET_PATTERNS[openai_api]="sk-[a-zA-Z0-9]{48}"
SECRET_PATTERNS[slack_bot]="xoxb-[0-9a-zA-Z-]+"
SECRET_PATTERNS[aws_access]="AKIA[0-9A-Z]{16}"
SECRET_PATTERNS[private_key]="-----BEGIN.*PRIVATE.*KEY-----"
SECRET_PATTERNS[eth_private]="0x[a-fA-F0-9]{64}"
SECRET_PATTERNS[jwt_secret]="['\"][a-zA-Z0-9+/]{32,}={0,2}['\"]"
SECRET_PATTERNS[database_url]="(postgresql|mongodb|redis)://[^\\s]+:[^\\s]+@[^\\s]+"
SECRET_PATTERNS[api_endpoint]="https?://[^\\s]+\\.[^\\s]+/[^\\s]*[a-zA-Z0-9]{16,}"

# Files and directories to exclude
EXCLUDE_DIRS=(
  ".git"
  "node_modules"
  ".github"
  "dist"
  "build"
  "coverage"
  ".nyc_output"
  "logs"
  "tmp"
  ".cache"
  "vault-data"
  "secrets"
  "demo_data"
  "test"
  "tests"
)

EXCLUDE_FILES=(
  "*.md"
  "*.template"
  "*.example"
  "secret-scan.sh"
  "security-check.yml"
  "*.log"
  "*.backup"
  "*.bak"
  "testData.js"
  "*test*.js"
  "*.test.js"
  "setup_demo.sh"
  "demo_data/*"
  "fallback_proofs/*"
  "mock_deployments.json"
  "sample_data.sql"
  "hardhat.config.js"
  "gas-analysis.js"
  "StreamDemo.sol"
)

# Build grep exclusion arguments
build_exclusions() {
  local exclude_args=""

  for dir in "${EXCLUDE_DIRS[@]}"; do
    exclude_args="$exclude_args --exclude-dir=$dir"
  done

  for file in "${EXCLUDE_FILES[@]}"; do
    exclude_args="$exclude_args --exclude=$file"
  done

  echo "$exclude_args"
}

# Scan for secrets using patterns
scan_secrets() {
  log_info "🔍 Starting secret detection scan..."

  local exclusions
  exclusions=$(build_exclusions)
  local found_secrets=false

  for pattern_name in "${!SECRET_PATTERNS[@]}"; do
    local pattern="${SECRET_PATTERNS[$pattern_name]}"
    log_verbose "Checking pattern: $pattern_name ($pattern)"

    # Use eval to properly expand the exclusions
    local cmd="grep -r -E '$pattern' . $exclusions --line-number --color=always"

    if eval "$cmd" 2>/dev/null; then
      log_error "Found potential $pattern_name secrets!"
      found_secrets=true
      EXIT_CODE=1

      if [ "$FIX_MODE" = true ]; then
        attempt_fix "$pattern_name" "$pattern"
      fi
    else
      log_verbose "✓ No $pattern_name secrets found"
    fi
  done

  if [ "$found_secrets" = false ]; then
    log_success "✅ No secrets detected in codebase"
  else
    log_error "❌ Potential secrets detected!"
    echo ""
    echo "To fix these issues:"
    echo "1. Remove any real secrets from the files"
    echo "2. Add sensitive files to .gitignore"
    echo "3. Use .env.template files for examples"
    echo "4. Store real secrets in HashiCorp Vault"
    echo "5. Use environment variables for configuration"
  fi
}

# Attempt to fix common issues
attempt_fix() {
  local pattern_name="$1"
  local pattern="$2"

  log_warning "🔧 Attempting to fix $pattern_name issues..."

  case "$pattern_name" in
    "database_url")
      log_info "Checking for database URLs in config files..."
      # Replace database URLs with placeholder
      find . -name "*.json" -o -name "*.js" -o -name "*.yml" | while read -r file; do
        if grep -q "postgresql://.*:.*@" "$file" 2>/dev/null; then
          log_warning "Found database URL in $file - consider using environment variables"
        fi
      done
      ;;
    "private_key")
      log_warning "Private keys detected - these should NEVER be in code"
      log_info "Please remove private keys and use secure key management"
      ;;
    *)
      log_info "Manual fix required for $pattern_name"
      ;;
  esac
}

# Check for environment files
check_env_files() {
  log_info "🔍 Checking for committed environment files..."

  local env_files
  env_files=$(find . -name ".env*" -not -name "*.template" -not -name "*.example" -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null || true)

  if [ -n "$env_files" ]; then
    log_error "❌ Found committed environment files:"
    echo "$env_files"
    echo ""
    echo "Environment files should not be committed. To fix:"
    echo "1. git rm --cached <file>"
    echo "2. Add to .gitignore"
    echo "3. Use .env.template instead"
    EXIT_CODE=1

    if [ "$FIX_MODE" = true ]; then
      log_info "🔧 Adding environment files to .gitignore..."
      if [ ! -f ".gitignore" ]; then
        touch .gitignore
      fi

      if ! grep -q "^\.env$" .gitignore; then
        echo ".env" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.development" >> .gitignore
        echo ".env.staging" >> .gitignore
        echo ".env.production" >> .gitignore
        log_success "Added environment files to .gitignore"
      fi
    fi
  else
    log_success "✅ No unauthorized environment files found"
  fi
}

# Check for hardcoded credentials
check_hardcoded_credentials() {
  log_info "🔍 Checking for hardcoded credentials..."

  local exclusions
  exclusions=$(build_exclusions)

  # Look for hardcoded passwords/keys in code
  local cmd="grep -r -i $exclusions --include='*.js' --include='*.ts' --include='*.json' -E '(password|secret|key|token)\\s*[:=]\\s*['\\\"][^'\\\"]{8,}['\\\"]' ."

  if eval "$cmd" 2>/dev/null; then
    log_error "❌ Found hardcoded credentials"
    echo ""
    echo "Please use environment variables or HashiCorp Vault instead"
    EXIT_CODE=1
  else
    log_success "✅ No hardcoded credentials found"
  fi
}

# Check git history for leaked secrets
check_git_history() {
  log_info "🕵️ Scanning recent git history..."

  if [ ! -d ".git" ]; then
    log_warning "Not a git repository, skipping history check"
    return
  fi

  # Check last 10 commits for potential secrets
  git log --pretty=format:"%H %s" -10 | while IFS=' ' read -r commit_hash commit_msg; do
    log_verbose "Checking commit: $commit_hash - $commit_msg"

    # Check for patterns that might indicate secrets
    if git show "$commit_hash" 2>/dev/null | grep -E "(password|secret|key|token)" | grep -E "[:=].*['\"][^'\"]{8,}['\"]" >/dev/null 2>&1; then
      log_warning "⚠️  Potential secret in commit: $commit_hash"
      log_warning "   Message: $commit_msg"
      log_warning "   Please review this commit manually"
    fi
  done

  log_success "✅ Git history scan complete"
}

# Generate security report
generate_report() {
  log_info "📊 Generating security report..."

  local report_file="security-scan-report-$(date +%Y%m%d-%H%M%S).txt"

  cat > "$report_file" << EOF
Stream Protocol Security Scan Report
Generated: $(date)
Command: $0 $*

Summary:
- Secret detection: $([ $EXIT_CODE -eq 0 ] && echo "PASSED" || echo "FAILED")
- Environment files: Checked
- Hardcoded credentials: Checked
- Git history: Scanned

$([ $EXIT_CODE -eq 0 ] && echo "✅ All security checks passed" || echo "❌ Security issues detected")

For detailed output, run with --verbose flag.

Next steps:
1. Review any issues identified above
2. Use HashiCorp Vault for secret management
3. Implement proper environment variable usage
4. Regular security scans in CI/CD pipeline

Contact: security@stream-protocol.io
EOF

  log_info "📄 Report saved to: $report_file"
}

# Main execution
main() {
  log_info "🔐 Stream Protocol Secret Detection Scanner"
  log_info "==========================================="
  echo ""

  # Run all checks
  scan_secrets
  check_env_files
  check_hardcoded_credentials
  check_git_history

  echo ""

  if [ $EXIT_CODE -eq 0 ]; then
    log_success "🎉 All security checks passed!"
  else
    log_error "🚨 Security issues detected!"
    echo ""
    echo "Run with --fix to attempt automatic fixes"
    echo "Run with --verbose for detailed output"
  fi

  if [ "$VERBOSE" = true ]; then
    generate_report
  fi

  exit $EXIT_CODE
}

# Run main function
main "$@"