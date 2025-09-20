#!/bin/bash

# Stream Protocol - Demo Monitoring Script
# Real-time monitoring of all demo components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service=$1
    local port=$2
    local name=$3

    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN} $name${NC} (port $port)"
        return 0
    else
        echo -e "${RED} $name${NC} (port $port)"
        return 1
    fi
}

# Function to check Docker service
check_docker_service() {
    local service=$1
    local name=$2

    if docker-compose -f docker-compose.demo.yml ps $service 2>/dev/null | grep -q "Up\|healthy"; then
        echo -e "${GREEN} $name${NC} (Docker)"
        return 0
    else
        echo -e "${RED} $name${NC} (Docker)"
        return 1
    fi
}

# Function to get system metrics
get_system_metrics() {
    echo -e "${CYAN}📊 SYSTEM METRICS${NC}"
    echo "=================="

    # Memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_info=$(free -h | awk 'NR==2{print $3"/"$2" ("$3/$2*100"%")"}')
        echo -e "Memory Usage: ${YELLOW}$mem_info${NC}"
    fi

    # Disk usage
    local disk_usage=$(df -h . | awk 'NR==2{print $3"/"$2" ("$5")"}')
    echo -e "Disk Usage: ${YELLOW}$disk_usage${NC}"

    # CPU load
    if command -v uptime >/dev/null 2>&1; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | xargs)
        echo -e "Load Average: ${YELLOW}$load_avg${NC}"
    fi

    # Node.js processes
    local node_processes=$(pgrep -f node | wc -l)
    echo -e "Node.js Processes: ${YELLOW}$node_processes${NC}"

    echo ""
}

# Function to check demo files
check_demo_files() {
    echo -e "${CYAN}📁 DEMO FILES${NC}"
    echo "=============="

    local files=(
        "./stream_hackathon_demo.js"
        "./setup_demo.sh"
        "./demo_data/scenarios.json"
        "./demo_data/fallback_proofs/starbucks_barista.json"
        "./demo_data/fallback_proofs/amazon_warehouse.json"
        "./demo_data/fallback_proofs/uber_driver.json"
    )

    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            echo -e "${GREEN}${NC} $file"
        else
            echo -e "${RED}${NC} $file"
        fi
    done

    echo ""
}

# Function to check network services
check_network_services() {
    echo -e "${CYAN}🌐 NETWORK SERVICES${NC}"
    echo "==================="

    local services_healthy=0
    local total_services=0

    # Check native services
    if check_service "PostgreSQL" 5432 "Database"; then services_healthy=$((services_healthy + 1)); fi
    total_services=$((total_services + 1))

    if check_service "Redis" 6379 "Cache"; then services_healthy=$((services_healthy + 1)); fi
    total_services=$((total_services + 1))

    if check_service "Hardhat" 8545 "Blockchain"; then services_healthy=$((services_healthy + 1)); fi
    total_services=$((total_services + 1))

    if check_service "Attestation" 3001 "Attestation Service"; then services_healthy=$((services_healthy + 1)); fi
    total_services=$((total_services + 1))

    # Calculate health percentage
    local health_percentage=$((services_healthy * 100 / total_services))
    echo -e "\nService Health: ${YELLOW}$services_healthy/$total_services ($health_percentage%)${NC}"

    echo ""
}

# Function to check Docker services
check_docker_services() {
    echo -e "${CYAN}🐳 DOCKER SERVICES${NC}"
    echo "==================="

    if command -v docker-compose >/dev/null 2>&1; then
        local docker_healthy=0
        local docker_total=0

        if check_docker_service "postgres" "PostgreSQL"; then docker_healthy=$((docker_healthy + 1)); fi
        docker_total=$((docker_total + 1))

        if check_docker_service "redis" "Redis"; then docker_healthy=$((docker_healthy + 1)); fi
        docker_total=$((docker_total + 1))

        if check_docker_service "hardhat" "Hardhat"; then docker_healthy=$((docker_healthy + 1)); fi
        docker_total=$((docker_total + 1))

        if check_docker_service "stream-demo-app" "Demo App"; then docker_healthy=$((docker_healthy + 1)); fi
        docker_total=$((docker_total + 1))

        local docker_health=$((docker_healthy * 100 / docker_total))
        echo -e "\nDocker Health: ${YELLOW}$docker_healthy/$docker_total ($docker_health%)${NC}"
    else
        echo -e "${YELLOW}  Docker not available${NC}"
    fi

    echo ""
}

# Function to show recent logs
show_recent_logs() {
    echo -e "${CYAN}📋 RECENT ACTIVITY${NC}"
    echo "=================="

    # Show last few lines from demo logs if they exist
    if [[ -f "./demo.log" ]]; then
        echo -e "${YELLOW}Demo Logs (last 5 lines):${NC}"
        tail -5 ./demo.log | while read line; do
            echo "  $line"
        done
    fi

    # Show Node.js processes
    echo -e "\n${YELLOW}Active Node.js Processes:${NC}"
    pgrep -f node | while read pid; do
        local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        echo "  PID $pid: $cmd"
    done

    echo ""
}

# Function to show demo status
show_demo_status() {
    echo -e "${CYAN}🎬 DEMO STATUS${NC}"
    echo "==============="

    # Check if demo is currently running
    if pgrep -f "stream_hackathon_demo.js" >/dev/null; then
        echo -e "${GREEN} Demo is currently running${NC}"
    else
        echo -e "${YELLOW}⏸️  Demo is not running${NC}"
    fi

    # Check if fallback mode is enabled
    if [[ "$USE_ALL_FALLBACKS" == "true" ]]; then
        echo -e "${YELLOW}  Fallback mode enabled${NC}"
    fi

    # Check if performance mode is enabled
    if [[ "$DEMO_PERFORMANCE_MODE" == "true" ]]; then
        echo -e "${BLUE} Performance mode enabled${NC}"
    fi

    echo ""
}

# Function to show quick actions
show_quick_actions() {
    echo -e "${CYAN}🚀 QUICK ACTIONS${NC}"
    echo "================"
    echo -e "Start Demo:      ${YELLOW}npm run demo${NC}"
    echo -e "Auto Demo:       ${YELLOW}npm run demo:auto${NC}"
    echo -e "Health Check:    ${YELLOW}npm run health-check${NC}"
    echo -e "Setup System:    ${YELLOW}./setup_demo.sh${NC}"
    echo -e "Docker Setup:    ${YELLOW}./docker_demo_runner.sh setup${NC}"
    echo -e "Enable Fallback: ${YELLOW}export USE_ALL_FALLBACKS=true${NC}"
    echo -e "Performance:     ${YELLOW}./performance_optimizer.js${NC}"
    echo ""
}

# Function to show emergency commands
show_emergency_commands() {
    echo -e "${RED}🚨 EMERGENCY COMMANDS${NC}"
    echo "======================"
    echo -e "Emergency Demo:  ${RED}node stream_hackathon_demo.js --auto --fallback${NC}"
    echo -e "Reset System:    ${RED}./setup_demo.sh${NC}"
    echo -e "Docker Reset:    ${RED}./docker_demo_runner.sh cleanup && ./docker_demo_runner.sh setup${NC}"
    echo -e "Kill All Node:   ${RED}killall node${NC}"
    echo -e "Show Arch:       ${RED}cat HACKATHON_TROUBLESHOOTING_GUIDE.md${NC}"
    echo ""
}

# Main monitoring function
monitor_system() {
    while true; do
        clear
        echo -e "${BLUE}🌊 STREAM PROTOCOL - DEMO MONITOR 🌊${NC}"
        echo -e "${BLUE}$(date)${NC}"
        echo -e "${BLUE}======================================${NC}"
        echo ""

        get_system_metrics
        check_demo_files
        check_network_services
        check_docker_services
        show_recent_logs
        show_demo_status
        show_quick_actions
        show_emergency_commands

        echo -e "${CYAN}Press Ctrl+C to exit, any key to refresh...${NC}"
        read -t 5 -n 1 2>/dev/null || true
    done
}

# Function to run single check
run_single_check() {
    echo -e "${BLUE}🌊 STREAM PROTOCOL - SYSTEM CHECK 🌊${NC}"
    echo -e "${BLUE}$(date)${NC}"
    echo "====================================="
    echo ""

    get_system_metrics
    check_demo_files
    check_network_services
    check_docker_services
    show_demo_status

    # Overall health assessment
    echo -e "${CYAN}📋 OVERALL ASSESSMENT${NC}"
    echo "====================="

    local issues=0

    # Check for critical files
    if [[ ! -f "./stream_hackathon_demo.js" ]]; then
        echo -e "${RED} Missing demo orchestrator${NC}"
        issues=$((issues + 1))
    fi

    if [[ ! -f "./demo_data/scenarios.json" ]]; then
        echo -e "${RED} Missing demo scenarios${NC}"
        issues=$((issues + 1))
    fi

    # Check for running services
    if ! nc -z localhost 5432 2>/dev/null && ! docker-compose -f docker-compose.demo.yml ps postgres 2>/dev/null | grep -q "Up"; then
        echo -e "${YELLOW}  Database not available (fallback mode available)${NC}"
    fi

    if [[ $issues -eq 0 ]]; then
        echo -e "${GREEN} System ready for demo!${NC}"
    elif [[ $issues -le 2 ]]; then
        echo -e "${YELLOW}  Minor issues detected, but demo should work with fallbacks${NC}"
    else
        echo -e "${RED} Major issues detected, run setup script${NC}"
    fi
}

# Handle command line arguments
case "${1:-monitor}" in
    monitor)
        monitor_system
        ;;
    check)
        run_single_check
        ;;
    status)
        show_demo_status
        ;;
    emergency)
        show_emergency_commands
        ;;
    help|--help|-h)
        echo "Stream Protocol Demo Monitor"
        echo ""
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  monitor     Start real-time monitoring (default)"
        echo "  check       Run single system check"
        echo "  status      Show demo status only"
        echo "  emergency   Show emergency commands"
        echo "  help        Show this help"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac