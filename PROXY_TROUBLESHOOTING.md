# NPM Proxy Troubleshooting

## Testing Your Proxy Setup

### 1. Check if proxy is running
```bash
# Try to connect to proxy
curl http://localhost:8081

# Or use telnet
telnet localhost 8081
```

### 2. Verify npm is using proxy
```bash
npm config list
```
Should show:
```
proxy = "http://localhost:8081"
https-proxy = "http://localhost:8081"
```

### 3. Test with a simple package
```bash
npm install lodash --verbose
```
Watch for connection details in verbose output.

---

## Common Proxy Issues & Solutions

### Issue 1: ECONNREFUSED
```
Error: connect ECONNREFUSED 127.0.0.1:8081
```

**Cause**: Proxy server is not running  
**Solutions**:
```bash
# Option A: Start your proxy server first
# (depends on your proxy setup)

# Option B: Disable proxy temporarily
npm config set proxy null --userconfig .npmrc
npm config set https-proxy null --userconfig .npmrc
npm install

# Option C: Use --no-proxy flag
npm install --no-proxy
```

### Issue 2: ETIMEDOUT
```
Error: connect ETIMEDOUT
```

**Cause**: Proxy is slow or not responding  
**Solutions**:
```bash
# Increase timeout
npm config set fetch-timeout 300000 --userconfig .npmrc

# Or use different registry
npm config set registry https://registry.npmjs.org --userconfig .npmrc
```

### Issue 3: SSL Certificate Issues
```
Error: unable to get local issuer certificate
```

**Cause**: SSL verification failing through proxy  
**Solutions**:
```bash
# Already set in .npmrc but if needed:
npm config set strict-ssl false --userconfig .npmrc

# Or use cafile if you have proxy's certificate
npm config set cafile /path/to/cert.pem --userconfig .npmrc
```

### Issue 4: Expo Commands Hanging
```bash
# Expo CLI may not work with proxy
npx expo start
# (hangs or fails)
```

**Solution**: Disable proxy for Expo commands
```bash
# Temporarily disable
npm config set proxy null --userconfig .npmrc
npm config set https-proxy null --userconfig .npmrc

# Run Expo command
npx expo start

# Re-enable proxy
npm config set proxy http://localhost:8081 --userconfig .npmrc
npm config set https-proxy http://localhost:8081 --userconfig .npmrc
```

### Issue 5: Some packages fail, others succeed
**Cause**: Binary dependencies or git dependencies bypass npm proxy  
**Solution**: Configure git and system proxy too
```bash
# Git proxy
git config --global http.proxy http://localhost:8081
git config --global https.proxy http://localhost:8081

# System proxy (macOS/Linux)
export HTTP_PROXY=http://localhost:8081
export HTTPS_PROXY=http://localhost:8081

# System proxy (Windows)
set HTTP_PROXY=http://localhost:8081
set HTTPS_PROXY=http://localhost:8081
```

---

## Proxy Configuration Patterns

### Pattern 1: Different proxies for HTTP/HTTPS
```ini
# .npmrc
proxy=http://localhost:8081
https-proxy=http://localhost:8082
```

### Pattern 2: Proxy with authentication
```ini
# .npmrc
proxy=http://username:password@localhost:8081
https-proxy=http://username:password@localhost:8081
```

### Pattern 3: No proxy for specific hosts
```ini
# .npmrc
noproxy=localhost,127.0.0.1,.local
```

### Pattern 4: Use proxy only for npm, not other tools
```bash
# Don't set environment variables
# Only use .npmrc configuration
# This keeps npm isolated
```

---

## Development Workflow with Proxy

### Scenario A: Proxy always on
1. Keep `.npmrc` as is
2. Ensure proxy server runs before `npm install`
3. Good for corporate environments

### Scenario B: Proxy sometimes needed
1. Create two files:
   - `.npmrc.proxy` (with proxy settings)
   - `.npmrc.noproxy` (without proxy)
2. Copy the one you need:
   ```bash
   cp .npmrc.proxy .npmrc    # Use proxy
   cp .npmrc.noproxy .npmrc  # No proxy
   ```

### Scenario C: Different developers, different needs
1. Add `.npmrc` to `.gitignore`
2. Create `.npmrc.example`:
   ```ini
   # Copy to .npmrc and customize
   # proxy=http://localhost:8081
   # https-proxy=http://localhost:8081
   # strict-ssl=false
   ```
3. Each developer maintains their own `.npmrc`

---

## Debugging Commands

### Check effective npm config
```bash
npm config list --json
```

### Check which .npmrc is being used
```bash
npm config get userconfig  # Shows path
```

### See where config comes from
```bash
npm config list -l  # Shows all levels
```

### Test proxy connection
```bash
# Using curl
curl -x http://localhost:8081 https://registry.npmjs.org/lodash

# Using npm with verbose logging
npm install lodash --loglevel verbose
```

### Clear npm cache
```bash
npm cache clean --force
```

---

## Quick Toggle Script

Save this as `toggle-proxy.sh`:
```bash
#!/bin/bash

if [ "$1" == "on" ]; then
    npm config set proxy http://localhost:8081 --userconfig .npmrc
    npm config set https-proxy http://localhost:8081 --userconfig .npmrc
    echo "✅ Proxy enabled"
elif [ "$1" == "off" ]; then
    npm config set proxy null --userconfig .npmrc
    npm config set https-proxy null --userconfig .npmrc
    echo "✅ Proxy disabled"
else
    echo "Usage: ./toggle-proxy.sh [on|off]"
fi
```

Usage:
```bash
chmod +x toggle-proxy.sh
./toggle-proxy.sh on   # Enable proxy
./toggle-proxy.sh off  # Disable proxy
```

---

## When Building with EAS

**Important**: EAS builds happen in the cloud, so your local proxy settings don't apply.

If your proxy is required to access npm registry:
1. Build will fail if npm registry is not accessible from EAS servers
2. Solutions:
   - Ensure packages are published to public npm registry
   - Use EAS secrets for private registries
   - Pre-bundle dependencies

```bash
# EAS builds ignore local .npmrc proxy settings
# This is normal and expected
eas build --platform android
```

---

## Additional Resources

- npm proxy docs: https://docs.npmjs.com/cli/v9/using-npm/config#proxy
- Expo troubleshooting: https://docs.expo.dev/troubleshooting/
- Network debugging: `npm install --verbose --loglevel silly`

---

**Still having issues?** Check:
1. Is your proxy server running? `curl http://localhost:8081`
2. Can you access internet without proxy? `curl https://registry.npmjs.org`
3. Try without proxy: `npm install --no-proxy`
