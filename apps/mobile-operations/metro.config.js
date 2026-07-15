const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
// Pack Thmanyah fourni en woff2 uniquement (chargé côté web).
config.resolver.assetExts = Array.from(new Set([...config.resolver.assetExts, 'woff', 'woff2']));

module.exports = config;
