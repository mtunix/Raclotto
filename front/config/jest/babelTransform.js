'use strict';

const babelJest = require('babel-jest').default;

const hasJsxRuntime = (() => {
  if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
    return false;
  }

  try {
    require.resolve('react/jsx-runtime');
    return true;
  } catch (e) {
    return false;
  }
})();

// ESM-only dependencies (react-router) read `import.meta`, which the CommonJS output can't express.
const importMetaToEmptyObject = ({ types: t }) => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
        path.replaceWith(t.objectExpression([]));
      }
    },
  },
});

module.exports = babelJest.createTransformer({
  presets: [
    [
      require.resolve('../babelPreset'),
      {
        runtime: hasJsxRuntime ? 'automatic' : 'classic',
      },
    ],
  ],
  plugins: [importMetaToEmptyObject],
  babelrc: false,
  configFile: false,
});
