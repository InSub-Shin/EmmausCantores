const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Metro picks up @supabase/supabase-js's ESM entry (index.mjs) via the
// package.json "exports" field. That ESM build contains `import(OTEL_PKG)`
// with a variable argument, which hermesc cannot compile. Force Metro to use
// the CJS entry (index.cjs) which uses require() instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// The CJS build calls require('@opentelemetry/api') inside a try/catch for
// optional telemetry. Provide an empty stub so the require() doesn't throw.
config.resolver.extraNodeModules = {
  '@opentelemetry/api': path.resolve(__dirname, './otel-mock.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
