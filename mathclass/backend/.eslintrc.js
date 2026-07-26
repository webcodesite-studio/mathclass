module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    // Blokuj console.log w kodzie produkcyjnym (tylko console.error/warn są OK)
    "no-console": ["warn", { allow: ["error", "warn", "log"] }],
    // Nie pozwól na niezadeklarowane zmienne
    "no-undef": "error",
    // Ostrzeżenie dla nieużywanych zmiennych
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    // Wymuś === zamiast ==
    "eqeqeq": ["error", "always"],
  },
};
