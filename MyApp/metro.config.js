/**
 * Metro configuration to ensure .cjs files (used by some packages like date-fns) are resolved.
 * Without this, Metro may fail to resolve imports like "./formatRFC3339.cjs" from date-fns.
 */
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();
  const resolver = { ...defaultConfig.resolver };

  // Ensure .cjs is included so CommonJS entrypoints used by some packages resolve
  resolver.sourceExts = Array.from(new Set([...(resolver.sourceExts || []), 'cjs']));

  // Prefer 'react-native' and 'main' fields so Metro selects CommonJS/react-native builds
  // instead of the ES Module 'module' field. This prevents ESM 'import' syntax from
  // being pulled into the bundle where Metro/Hermes expect CommonJS.
  resolver.mainFields = ['react-native', 'main'];

  // Some packages rely on Metro's asset registry path being resolvable from node_modules
  // Provide the asset registry implementation from react-native so requests for
  // 'missing-asset-registry-path' resolve correctly.
  try {
    resolver.assetRegistryPath = require.resolve('react-native/Libraries/Image/AssetRegistry');
  } catch (e) {
    // If resolution fails, fall back to any existing config (Metro will throw later if needed)
    console.warn('Could not resolve react-native AssetRegistry for metro.config resolver.assetRegistryPath', e);
  }

  // Provide a mapping for packages that import a placeholder path like
  // 'missing-asset-registry-path' — point it to RN's AssetRegistry.
  // Map the placeholder module name to our shim file so Metro resolves it from node_modules imports
  const path = require('path');
  const shimPath = path.resolve(__dirname, 'shims', 'missing-asset-registry-path.js');
  // If a shim package was installed under node_modules, prefer that so Metro resolves it like a normal package.
  const shimPackagePath = path.resolve(__dirname, 'node_modules', 'missing-asset-registry-path');
  const mappedShim = require('fs').existsSync(shimPackagePath) ? shimPackagePath : shimPath;
  resolver.extraNodeModules = {
    ...(resolver.extraNodeModules || {}),
    'missing-asset-registry-path': mappedShim,
  };

  return {
    ...defaultConfig,
    resolver,
  };
})();
