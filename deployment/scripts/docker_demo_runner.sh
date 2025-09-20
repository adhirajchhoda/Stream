#!/bin/bash

# Stream Protocol - Docker Demo Runner
# Bulletproof Docker-based demo environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Stream Protocol - Docker Demo Environment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to check if Docker is available
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${RED} Docker not found. Please install Docker first.${NC}"
        exit 1
    fi

    if ! command -v docker-compose >/dev/null 2>&1; then
        echo -e "${RED} Docker Compose not found. Please install Docker Compose first.${NC}"
        exit 1
    fi

    echo -e "${GREEN} Docker and Docker Compose available${NC}"
}

# Function to create required directories
create_directories() {
    echo -e "${YELLOW}📁 Creating required directories...${NC}"

    mkdir -p docker-data/{postgres,redis,logs,grafana}
    mkdir -p demo_data/{fallback_proofs,fallback_contracts}

    echo -e "${GREEN} Directories created${NC}"
}

# Function to build Docker images
build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"

    # Build main demo image
    docker build -f Dockerfile.demo -t stream-protocol-demo:latest .

    # Build attestation service if Dockerfile exists
    if [[ -f "attestation-service/Dockerfile" ]]; then
        docker build -t stream-attestation-service:latest ./attestation-service
    else
        echo -e "${YELLOW}  Attestation service Dockerfile not found, will use Node.js base image${NC}"
    fi

    echo -e "${GREEN} Docker images built${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting Docker services...${NC}"

    # Start core services
    docker-compose -f docker-compose.demo.yml up -d postgres redis

    echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
    sleep 10

    # Start remaining services
    docker-compose -f docker-compose.demo.yml up -d

    echo -e "${GREEN} All services started${NC}"
}

# Function to check service health
check_services() {
    echo -e "${YELLOW}🏥 Checking service health...${NC}"

    local services=("postgres" "redis" "hardhat" "stream-demo-app")
    local healthy_count=0

    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.demo.yml ps "$service" | grep -q "healthy\|Up"; then
            echo -e "${GREEN} $service: Healthy${NC}"
            healthy_count=$((healthy_count + 1))
        else
            echo -e "${RED} $service: Unhealthy${NC}"
        fi
    done

    local health_percentage=$((healthy_count * 100 / ${#services[@]}))
    echo -e "${BLUE}Overall Health: ${health_percentage}%${NC}"

    if [[ $health_percentage -ge 75 ]]; then
        echo -e "${GREEN}🎉 Demo environment ready!${NC}"
        return 0
    else
        echo -e "${YELLOW}  Some services are unhealthy but demo may still work${NC}"
        return 1
    fi
}

# Function to run demo
run_demo() {
    echo -e "${YELLOW}🎬 Running Stream Protocol demo...${NC}"

    # Interactive demo
    docker-compose -f docker-compose.demo.yml exec stream-demo-app node stream_hackathon_demo.js

    echo -e "${GREEN} Demo completed${NC}"
}

# Function to run auto demo
run_auto_demo() {
    echo -e "${YELLOW}🤖 Running automated demo...${NC}"

    docker-compose -f docker-compose.demo.yml exec stream-demo-app node stream_hackathon_demo.js --auto

    echo -e "${GREEN} Automated demo completed${NC}"
}

# Function to show logs
show_logs() {
    echo -e "${YELLOW}📋 Showing service logs...${NC}"

    docker-compose -f docker-compose.demo.yml logs --tail=50 --follow
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Docker services...${NC}"

    docker-compose -f docker-compose.demo.yml down

    echo -e "${GREEN} Services stopped${NC}"
}

# Function to clean up
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up Docker environment...${NC}"

    docker-compose -f docker-compose.demo.yml down -v --remove-orphans
    docker system prune -f

    echo -e "${GREEN} Cleanup completed${NC}"
}

# Function to show service status
show_status() {
    echo -e "${YELLOW}📊 Service Status:${NC}"
    docker-compose -f docker-compose.demo.yml ps

    echo -e "\n${YELLOW}🌐 Service URLs:${NC}"
    echo -e "  Demo App:       http://localhost:3000"
    echo -e "  Attestation:    http://localhost:3001"
    echo -e "  Blockchain:     http://localhost:8545"
    echo -e "  Database:       localhost:5432"
    echo -e "  Redis:          localhost:6379"
    echo -e "  Monitoring:     http://localhost:3002 (if enabled)"
}

# Function to backup demo state
backup_state() {
    echo -e "${YELLOW}💾 Backing up demo state...${NC}"

    local backup_dir="./demo_backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    # Backup database
    docker-compose -f docker-compose.demo.yml exec -T postgres pg_dump -U stream_user stream_demo > "$backup_dir/database.sql"

    # Backup demo data
    cp -r demo_data "$backup_dir/"

    echo -e "${GREEN} Backup created: $backup_dir${NC}"
}

# Function to restore demo state
restore_state() {
    local backup_dir="$1"

    if [[ -z "$backup_dir" ]]; then
        echo -e "${RED} Please specify backup directory${NC}"
        exit 1
    fi

    echo -e "${YELLOW}📥 Restoring demo state from: $backup_dir${NC}"

    # Restore database
    if [[ -f "$backup_dir/database.sql" ]]; then
        docker-compose -f docker-compose.demo.yml exec -T postgres psql -U stream_user -d stream_demo < "$backup_dir/database.sql"
        echo -e "${GREEN} Database restored${NC}"
    fi

    # Restore demo data
    if [[ -d "$backup_dir/demo_data" ]]; then
        cp -r "$backup_dir/demo_data" ./
        echo -e "${GREEN} Demo data restored${NC}"
    fi
}

# Function to enable monitoring
enable_monitoring() {
    echo -e "${YELLOW}📊 Enabling monitoring dashboard...${NC}"

    docker-compose -f docker-compose.demo.yml --profile monitoring up -d grafana

    echo -e "${GREEN} Monitoring enabled at http://localhost:3002${NC}"
    echo -e "${BLUE}Login: admin / demo123${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Stream Protocol Docker Demo Runner${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup         Full setup (build + start + health check)"
    echo "  build         Build Docker images"
    echo "  start         Start services"
    echo "  stop          Stop services"
    echo "  restart       Restart services"
    echo "  demo          Run interactive demo"
    echo "  auto          Run automated demo"
    echo "  status        Show service status"
    echo "  logs          Show service logs"
    echo "  health        Check service health"
    echo "  backup        Backup demo state"
    echo "  restore DIR   Restore demo state from backup"
    echo "  monitoring    Enable monitoring dashboard"
    echo "  cleanup       Clean up everything"
    echo "  help          Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup      # Complete setup and demo"
    echo "  $0 auto       # Quick automated demo"
    echo "  $0 logs       # Monitor all service logs"
}

# Main execution
main() {
    case "${1:-setup}" in
        setup)
            check_docker
            create_directories
            build_images
            start_services
            sleep 15  # Give services time to start
            if check_services; then
                echo -e "\n${GREEN}🎯 Setup complete! Choose your next step:${NC}"
                echo -e "  ${YELLOW}$0 demo${NC}      # Interactive demo"
                echo -e "  ${YELLOW}$0 auto${NC}      # Automated demo"
                echo -e "  ${YELLOW}$0 status${NC}    # Check status"
            fi
            ;;
        build)
            check_docker
            create_directories
            build_images
            ;;
        start)
            check_docker
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 5
            start_services
            ;;
        demo)
            run_demo
            ;;
        auto)
            run_auto_demo
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        health)
            check_services
            ;;
        backup)
            backup_state
            ;;
        restore)
            restore_state "$2"
            ;;
        monitoring)
            enable_monitoring
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED} Unknown command: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Handle interruption gracefully
trap 'echo -e "\n${YELLOW}🛑 Demo interrupted. Run: $0 stop${NC}"; exit 0' INT

# Run main function
main "$@"