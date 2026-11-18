'use strict';

const path = require('path');

// What babel-preset-react-app did for this app, on Babel 8. `dependencies: true` is its
// `dependencies` preset: standard syntax only, for code under node_modules.
module.exports = function (api, { dependencies = false, runtime = 'automatic' } = {}) {
  const env = api.env();
  const isEnvDevelopment = env === 'development';
  const isEnvProduction = env === 'production';
  const isEnvTest = env === 'test';
  if (!isEnvDevelopment && !isEnvProduction && !isEnvTest) {
    throw new Error(
      `config/babelPreset.js needs BABEL_ENV or NODE_ENV set to development, test or production; got ${JSON.stringify(env)}.`
    );
  }

  const presetEnv = [
    require.resolve('@babel/preset-env'),
    isEnvTest
      ? { targets: { node: 'current' }, modules: 'commonjs', exclude: ['transform-typeof-symbol'] }
      : { exclude: ['transform-typeof-symbol'] },
  ];
  // Helpers resolve to this app's @babel/runtime, not an older copy nested under a dependency.
  const transformRuntime = [
    require.resolve('@babel/plugin-transform-runtime'),
    {
      version: require('@babel/runtime/package.json').version,
      absoluteRuntime: path.dirname(require.resolve('@babel/runtime/package.json')),
    },
  ];

  if (dependencies) {
    return { sourceType: 'unambiguous', presets: [presetEnv], plugins: [transformRuntime] };
  }

  return {
    presets: [
      presetEnv,
      // Babel 7 elided imports only used as types; Babel 8 keeps them unless they say `import type`.
      [require.resolve('@babel/preset-typescript'), { onlyRemoveTypeImports: false }],
    ],
    plugins: [transformRuntime],
    overrides: [
      {
        // Babel 8 parses JSX in every file preset-react sees, which breaks `<T,>() =>` generics in .ts.
        exclude: /\.[cm]?ts$/,
        presets: [
          [
            require.resolve('@babel/preset-react'),
            { runtime, development: isEnvDevelopment || isEnvTest },
          ],
        ],
      },
    ],
  };
};
