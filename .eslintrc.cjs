module.exports = {
  root: true,
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "warn",
    "react-hooks/exhaustive-deps": "warn",
  },
  ignorePatterns: [
    "node_modules",
    ".expo",
    "dist",
    "src/api/generated/**",
    "*.config.js",
    "babel.config.js",
    "metro.config.js",
  ],
};
