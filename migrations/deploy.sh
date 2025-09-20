#!/bin/bash

# Stream Protocol Database Migration Deployment Script
# Description: Automated deployment of database schema with rollback capability
# Version: 1.0.0
# Date: 2024-09-20

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-stream_protocol}"
DB_USER="${DB_USER:-stream_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
MIGRATION_DIR="$(dirname "$0")"
LOG_FILE="deployment_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    # Check if PostgreSQL client is installed
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client (psql) is not installed"
    fi

    # Check if migration files exist
    local migrations=(
        "001_initial_schema.sql"
        "002_attestations_and_zkp.sql"
        "003_liquidity_pools.sql"
        "004_wage_advances.sql"
        "005_monitoring_and_staking.sql"
        "006_final_indexes_and_optimization.sql"
    )

    for migration in "${migrations[@]}"; do
        if [[ ! -f "$MIGRATION_DIR/$migration" ]]; then
            error "Migration file $migration not found"
        fi
    done

    success "All prerequisites satisfied"
}

# Test database connection
test_connection() {
    info "Testing database connection..."

    export PGPASSWORD="$DB_PASSWORD"
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT as user $DB_USER"
    fi

    success "Database connection successful"
}

# Create migration tracking table
create_migration_table() {
    info "Creating migration tracking table..."

    export PGPASSWORD="$DB_PASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            applied_at TIMESTAMP DEFAULT NOW(),
            checksum VARCHAR(64)
        );
    " >> "$LOG_FILE" 2>&1

    success "Migration tracking table ready"
}

# Calculate file checksum
calculate_checksum() {
    local file="$1"
    if command -v sha256sum &> /dev/null; then
        sha256sum "$file" | cut -d' ' -f1
    elif command -v shasum &> /dev/null; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        # Fallback to md5 if sha256 is not available
        md5sum "$file" | cut -d' ' -f1
    fi
}

# Check if migration was already applied
is_migration_applied() {
    local version="$1"
    export PGPASSWORD="$DB_PASSWORD"
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';
    " | tr -d ' ')
    [[ "$count" -gt 0 ]]
}

# Apply single migration
apply_migration() {
    local migration_file="$1"
    local version="${migration_file%.sql}"
    local description="Migration $version"

    if is_migration_applied "$version"; then
        warning "Migration $version already applied, skipping..."
        return 0
    fi

    info "Applying migration: $migration_file"

    local checksum=$(calculate_checksum "$MIGRATION_DIR/$migration_file")
    local start_time=$(date +%s)

    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_DIR/$migration_file" >> "$LOG_FILE" 2>&1; then
        # Record successful migration
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO schema_migrations (version, description, checksum)
            VALUES ('$version', '$description', '$checksum');
        " >> "$LOG_FILE" 2>&1

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        success "Migration $version applied successfully in ${duration}s"
    else
        error "Failed to apply migration $version"
    fi
}

# Rollback migration
rollback_migration() {
    local version="$1"
    warning "Rolling back migration: $version"

    export PGPASSWORD="$DB_PASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DELETE FROM schema_migrations WHERE version = '$version';
    " >> "$LOG_FILE" 2>&1

    warning "Migration $version rolled back (manual schema cleanup may be required)"
}

# Validate deployment
validate_deployment() {
    info "Validating deployment..."

    export PGPASSWORD="$DB_PASSWORD"

    # Check critical tables exist
    local tables=(
        "payment_rails"
        "employers"
        "employees"
        "wage_attestations"
        "liquidity_pools"
        "wage_advances"
        "zkp_nullifiers"
    )

    for table in "${tables[@]}"; do
        local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = '$table'
            );
        " | tr -d ' ')

        if [[ "$exists" != "t" ]]; then
            error "Critical table $table not found"
        fi
    done

    # Check critical indexes exist
    local indexes=(
        "idx_employees_wallet_complete"
        "idx_nullifiers_hash_lookup"
        "idx_advances_employee_status_timeline"
    )

    for index in "${indexes[@]}"; do
        local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT EXISTS (
                SELECT FROM pg_indexes
                WHERE indexname = '$index'
            );
        " | tr -d ' ')

        if [[ "$exists" != "t" ]]; then
            error "Critical index $index not found"
        fi
    done

    # Check initial data exists
    local rail_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM payment_rails WHERE rail_type = 'CRYPTO';
    " | tr -d ' ')

    if [[ "$rail_count" -lt 3 ]]; then
        error "Initial payment rails data not found"
    fi

    success "Deployment validation completed successfully"
}

# Backup database
backup_database() {
    info "Creating database backup..."

    local backup_file="backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"

    export PGPASSWORD="$DB_PASSWORD"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"; then
        success "Database backup created: $backup_file"
        echo "$backup_file"
    else
        error "Failed to create database backup"
    fi
}

# Performance test
performance_test() {
    info "Running performance tests..."

    export PGPASSWORD="$DB_PASSWORD"

    # Test employee lookup performance
    local start_time=$(date +%s%3N)
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT * FROM employees WHERE wallet_address = '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b0000' LIMIT 1;
    " > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local employee_lookup_time=$((end_time - start_time))

    # Test payment rail lookup performance
    start_time=$(date +%s%3N)
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT * FROM payment_rails WHERE is_active = true AND rail_type = 'CRYPTO' LIMIT 5;
    " > /dev/null 2>&1
    end_time=$(date +%s%3N)
    local rail_lookup_time=$((end_time - start_time))

    info "Performance test results:"
    info "  Employee lookup: ${employee_lookup_time}ms (target: <5ms)"
    info "  Payment rail lookup: ${rail_lookup_time}ms (target: <3ms)"

    if [[ $employee_lookup_time -gt 50 ]]; then
        warning "Employee lookup performance is below target"
    fi

    if [[ $rail_lookup_time -gt 30 ]]; then
        warning "Payment rail lookup performance is below target"
    fi
}

# Main deployment function
deploy() {
    local skip_backup="${1:-false}"

    info "Starting Stream Protocol database deployment..."
    info "Target database: $DB_NAME at $DB_HOST:$DB_PORT"

    check_prerequisites
    test_connection
    create_migration_table

    # Create backup unless skipped
    local backup_file=""
    if [[ "$skip_backup" != "true" ]]; then
        backup_file=$(backup_database)
    fi

    # Apply migrations in order
    local migrations=(
        "001_initial_schema.sql"
        "002_attestations_and_zkp.sql"
        "003_liquidity_pools.sql"
        "004_wage_advances.sql"
        "005_monitoring_and_staking.sql"
        "006_final_indexes_and_optimization.sql"
    )

    local applied_migrations=()
    local failed_migration=""

    for migration in "${migrations[@]}"; do
        if apply_migration "$migration"; then
            applied_migrations+=("${migration%.sql}")
        else
            failed_migration="${migration%.sql}"
            break
        fi
    done

    if [[ -n "$failed_migration" ]]; then
        error "Deployment failed at migration: $failed_migration"

        # Ask for rollback
        read -p "Do you want to rollback applied migrations? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for ((i=${#applied_migrations[@]}-1; i>=0; i--)); do
                rollback_migration "${applied_migrations[i]}"
            done
        fi

        exit 1
    fi

    validate_deployment
    performance_test

    success "Stream Protocol database deployment completed successfully!"
    info "Log file: $LOG_FILE"

    if [[ -n "$backup_file" ]]; then
        info "Backup file: $backup_file"
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-backup    Skip database backup before deployment"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST          Database host (default: localhost)"
    echo "  DB_PORT          Database port (default: 5432)"
    echo "  DB_NAME          Database name (default: stream_protocol)"
    echo "  DB_USER          Database user (default: stream_user)"
    echo "  DB_PASSWORD      Database password (required)"
    echo ""
    echo "Example:"
    echo "  DB_PASSWORD=mypassword ./deploy.sh"
    echo "  DB_PASSWORD=mypassword ./deploy.sh --skip-backup"
}

# Main script logic
main() {
    local skip_backup="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                skip_backup="true"
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    if [[ -z "${DB_PASSWORD:-}" ]]; then
        error "DB_PASSWORD environment variable is required"
    fi

    deploy "$skip_backup"
}

# Run main function with all arguments
main "$@"