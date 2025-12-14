module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',
      // Polyfill import.meta for web compatibility
      function () {
        return {
          name: 'transform-import-meta',
          visitor: {
            MetaProperty(path) {
              if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                path.replaceWithSourceString('({ env: process.env, url: "" })');
              }
            },
          },
        };
      },
    ],
  };
};
