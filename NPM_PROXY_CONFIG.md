# NPM Proxy Configuration

This project uses a local `.npmrc` file to configure npm to use a local proxy at `http://localhost:8081`.

## How It Works

The `.npmrc` file in the project root overrides your global npm settings only for this project.

## Configuration

Current settings in `.npmrc`:
```
registry=http://localhost:8081
proxy=http://localhost:8081
https-proxy=http://localhost:8081
strict-ssl=false
```

## Usage

### Install Dependencies
```bash
npm install
```

Dependencies will be fetched through the proxy automatically.

### Temporarily Disable Proxy

If you need to bypass the proxy for a specific command:

```bash
# Disable proxy for one command
npm install --no-proxy

# Or set it to null temporarily
npm config set proxy null --userconfig .npmrc
npm config set https-proxy null --userconfig .npmrc
```

### Re-enable Proxy

To restore proxy settings:
```bash
npm config set proxy http://localhost:8081 --userconfig .npmrc
npm config set https-proxy http://localhost:8081 --userconfig .npmrc
```

## Troubleshooting

### Issue: "ECONNREFUSED" errors
**Cause**: Proxy server at localhost:8081 is not running  
**Solution**: 
1. Start your proxy server
2. Or temporarily disable proxy: `npm install --no-proxy`

### Issue: Expo commands fail with proxy
**Cause**: Expo CLI may not work well with proxies  
**Solution**: Temporarily disable for Expo commands:
```bash
npm config set proxy null --userconfig .npmrc
npx expo start
# Re-enable after
npm config set proxy http://localhost:8081 --userconfig .npmrc
```

### Issue: EAS Build fails
**Cause**: EAS builds in the cloud and doesn't use your local proxy  
**Solution**: No action needed - EAS builds ignore local `.npmrc`

## Switching Between Environments

### Development (with proxy)
```bash
# Use existing .npmrc
npm install
```

### CI/CD or Different Environment (without proxy)
```bash
# Rename .npmrc temporarily
mv .npmrc .npmrc.backup

# Install without proxy
npm install

# Restore
mv .npmrc.backup .npmrc
```

## Alternative: Environment-Specific Configuration

You can also use environment variables:

```bash
# Set proxy for current session only
export HTTP_PROXY=http://localhost:8081
export HTTPS_PROXY=http://localhost:8081
npm install

# Or per-command
HTTP_PROXY=http://localhost:8081 npm install
```

## Global vs Local Settings

- **Global** `.npmrc`: Located at `~/.npmrc` (user home)
- **Local** `.npmrc`: Located in project root (this file)
- **Priority**: Local settings override global settings

To check effective settings:
```bash
npm config list
```

## Security Note

⚠️ The `.npmrc` file has `strict-ssl=false` for local development with the proxy. **Do not use this configuration when connecting to public npm registry** as it disables SSL verification.

For production or public registries, use:
```
strict-ssl=true
```

---

**Related Files:**
- `.npmrc` - Project npm configuration
- `BUILD_ANDROID.md` - Android build instructions
