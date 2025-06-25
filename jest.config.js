const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // force l’utilisation du bon tsconfig
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};