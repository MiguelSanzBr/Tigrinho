// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Localização do shim. Crie este arquivo na raiz: ./shim-empty.js
const SHIM_EMPTY_PATH = path.resolve(__dirname, 'shim-empty.js');

const config = getDefaultConfig(__dirname);

// --- 1. Configurações para WebAssembly (.wasm) ---

// Adiciona '.wasm' na lista de extensões de assets
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Garante que '.wasm' NÃO está em sourceExts (não é código JS/TS)
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

// --- 2. Configurações para Módulos Node.js (Correção do 'fs' e 'path') ---

// Otimiza o processo de resolução de módulos para substituir módulos Node.js
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules, // Mantém quaisquer configurações existentes
  // Força o Metro a substituir as importações desses módulos pelo arquivo shim-empty
  'fs': SHIM_EMPTY_PATH,
  'path': SHIM_EMPTY_PATH,
  'crypto': SHIM_EMPTY_PATH, // Frequentemente necessário para outras libs
  // Adicione outros módulos Node.js que possam falhar, se necessário
};

module.exports = config;