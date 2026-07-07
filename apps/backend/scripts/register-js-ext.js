/**
 * Hook require pour ts-node : le code source utilise des imports relatifs
 * suffixés « .js » (convention ESM, résolus par nest build), que le loader
 * CommonJS de ts-node ne mappe pas vers les fichiers .ts. On retente sans
 * l'extension quand la résolution échoue.
 */
const Module = require('module');
const original = Module._resolveFilename;

Module._resolveFilename = function (request, ...args) {
  if (request.startsWith('.') && request.endsWith('.js')) {
    try {
      return original.call(this, request, ...args);
    } catch {
      return original.call(this, request.slice(0, -3), ...args);
    }
  }
  return original.call(this, request, ...args);
};
