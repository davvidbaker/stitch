/**
 * Borrowed some (not all) conventions from Scott Nonnenberg. 👍
 * https://blog.scottnonnenberg.com/eslint-part-1-exploration/
 * 
 * - Always use ‘error’ or ‘off’ instead of 0 and 2. Numbers are for real config values.
 * - Rules are in alphabetical order: first core ESLint, then plugins sorted by name.
 */

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  parser: 'babel-eslint',
  extends: 'airbnb',
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
    // ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: ['import', 'react', 'jsx-a11y'],
  globals: {
    NODE_ENV: true,
    SERVER: true,
    describe: true,
    it: true,
    expect: true,
  },
  rules: {
    'arrow-parens': 'off',
    'comma-dangle': 'off',
    'one-var': 'off',
    'no-bitwise': 'off',
    'no-case-declarations': 'off',
    'no-console': 'off',
    'no-plusplus': 'off',
    'no-unused-vars': 'error',
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
      },
    ],
    'import/no-extraneous-dependencies': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'jsx-a11y/href-no-hash': 'off',
    'jsx-a11y/accessible-emoji': 'off',
    'react/jsx-filename-extension': 'off',
    'react/prop-types': 'off',
    'react/sort-comp': 'off',
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: './webpack.common.js',
      },
    },
  },
};
