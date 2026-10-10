
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'wasm'
);

config.resolver.assetExts.push('wasm');

module.exports = config;
