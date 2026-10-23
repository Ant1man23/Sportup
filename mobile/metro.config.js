const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    /**
     * Fix: Metro internally requires 'react-native/asset-registry' when
     * bundling static image assets (jpg, png…). In this version of RN the
     * actual module lives at Libraries/Image/AssetRegistry, not at the
     * top-level 'asset-registry' shortcut. We redirect it here.
     */
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native/asset-registry') {
        return {
          filePath: path.resolve(
            __dirname,
            'node_modules/react-native/Libraries/Image/AssetRegistry.js',
          ),
          type: 'sourceFile',
        };
      }
      // Fall through to default resolution for everything else
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
