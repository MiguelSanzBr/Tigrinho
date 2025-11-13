const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Garantir que '.wasm' está em assetExts (arquivos estáticos)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Remover wasm de sourceExts se estiver lá
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

module.exports = config;
