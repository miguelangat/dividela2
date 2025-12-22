#!/bin/bash

# Toggle NPM Proxy for Dividela Project
# Usage: ./toggle-proxy.sh [on|off|status]

NPMRC_FILE=".npmrc"
PROXY_URL="http://localhost:8081"

show_status() {
    if grep -q "^proxy=http" "$NPMRC_FILE" 2>/dev/null; then
        echo "📡 Proxy is currently: ENABLED"
        echo "   Proxy: $(grep "^proxy=" "$NPMRC_FILE")"
        echo "   HTTPS Proxy: $(grep "^https-proxy=" "$NPMRC_FILE")"
    else
        echo "📡 Proxy is currently: DISABLED"
    fi
}

enable_proxy() {
    npm config set proxy "$PROXY_URL" --userconfig "$NPMRC_FILE"
    npm config set https-proxy "$PROXY_URL" --userconfig "$NPMRC_FILE"
    npm config set strict-ssl false --userconfig "$NPMRC_FILE"
    echo "✅ Proxy enabled: $PROXY_URL"
}

disable_proxy() {
    npm config delete proxy --userconfig "$NPMRC_FILE" 2>/dev/null
    npm config delete https-proxy --userconfig "$NPMRC_FILE" 2>/dev/null
    echo "✅ Proxy disabled"
}

case "$1" in
    on|enable)
        enable_proxy
        ;;
    off|disable)
        disable_proxy
        ;;
    status|"")
        show_status
        ;;
    *)
        echo "Usage: $0 [on|off|status]"
        echo ""
        echo "Commands:"
        echo "  on      - Enable proxy ($PROXY_URL)"
        echo "  off     - Disable proxy"
        echo "  status  - Show current proxy status (default)"
        exit 1
        ;;
esac
