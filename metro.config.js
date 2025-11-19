// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to handle web builds better
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: true,
    },
  }),
  // Add Babel transformer to handle import.meta
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
};

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
  // Resolve web-specific modules
  resolverMainFields: ['browser', 'module', 'main'],
};

// Polyfill import.meta for web
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
