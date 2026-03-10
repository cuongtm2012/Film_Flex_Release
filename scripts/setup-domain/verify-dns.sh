#!/bin/bash

# DNS Verification Script for phimgg.com
# Checks DNS propagation and configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="phimgg.com"
EXPECTED_IP="38.54.14.154"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

print_banner() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  DNS Verification for $DOMAIN"
    echo "  Expected IP: $EXPECTED_IP"
    echo "========================================"
    echo -e "${NC}"
}

# Check A record
check_a_record() {
    log "Checking A record for $DOMAIN..."
    
    if command -v dig &> /dev/null; then
        RESULT=$(dig +short $DOMAIN A)
        if [ "$RESULT" = "$EXPECTED_IP" ]; then
            success "$DOMAIN points to $RESULT"
        else
            error "$DOMAIN points to $RESULT, expected $EXPECTED_IP"
        fi
    else
        warning "dig command not available"
    fi
}

# Check WWW record
check_www_record() {
    log "Checking A record for www.$DOMAIN..."
    
    if command -v dig &> /dev/null; then
        RESULT=$(dig +short www.$DOMAIN A)
        if [ "$RESULT" = "$EXPECTED_IP" ]; then
            success "www.$DOMAIN points to $RESULT"
        elif [ -z "$RESULT" ]; then
            warning "www.$DOMAIN is not configured"
        else
            error "www.$DOMAIN points to $RESULT, expected $EXPECTED_IP"
        fi
    fi
}

# Check from multiple DNS servers
check_dns_propagation() {
    log "Checking DNS propagation from multiple servers..."
    
    DNS_SERVERS=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")
    
    for dns in "${DNS_SERVERS[@]}"; do
        if command -v dig &> /dev/null; then
            RESULT=$(dig @$dns +short $DOMAIN A)
            if [ "$RESULT" = "$EXPECTED_IP" ]; then
                success "DNS server $dns returns $RESULT"
            else
                error "DNS server $dns returns $RESULT"
            fi
        fi
    done
}

# Check TTL
check_ttl() {
    log "Checking TTL values..."
    
    if command -v dig &> /dev/null; then
        TTL=$(dig $DOMAIN A | grep -E "^$DOMAIN" | awk '{print $2}')
        if [ ! -z "$TTL" ]; then
            log "TTL for $DOMAIN: ${TTL}s"
            if [ "$TTL" -lt 300 ]; then
                success "Low TTL ($TTL) - changes propagate quickly"
            else
                log "TTL is $TTL seconds"
            fi
        fi
    fi
}

# Reverse DNS lookup
reverse_dns() {
    log "Checking reverse DNS for $EXPECTED_IP..."
    
    if command -v dig &> /dev/null; then
        REVERSE=$(dig +short -x $EXPECTED_IP)
        if [ ! -z "$REVERSE" ]; then
            log "Reverse DNS: $REVERSE"
        else
            warning "No reverse DNS configured"
        fi
    fi
}

# WHOIS information
check_whois() {
    log "Checking domain registration..."
    
    if command -v whois &> /dev/null; then
        EXPIRY=$(whois $DOMAIN | grep -i "expir" | head -1)
        if [ ! -z "$EXPIRY" ]; then
            log "$EXPIRY"
        fi
        
        REGISTRAR=$(whois $DOMAIN | grep -i "registrar:" | head -1)
        if [ ! -z "$REGISTRAR" ]; then
            log "$REGISTRAR"
        fi
    else
        warning "whois command not available"
    fi
}

# Main execution
main() {
    print_banner
    
    case "${1:-all}" in
        "a"|"A")
            check_a_record
            ;;
        "www")
            check_www_record
            ;;
        "propagation"|"prop")
            check_dns_propagation
            ;;
        "ttl")
            check_ttl
            ;;
        "reverse")
            reverse_dns
            ;;
        "whois")
            check_whois
            ;;
        "all"|*)
            check_a_record
            check_www_record
            check_dns_propagation
            check_ttl
            reverse_dns
            check_whois
            ;;
    esac
    
    echo ""
    log "DNS verification completed"
}

main "$@"