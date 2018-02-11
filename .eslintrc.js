module.exports = {
  env: {
    node: true,
    jest: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 8
  },
  rules: {
    'no-console': 'warn'
  }
};
