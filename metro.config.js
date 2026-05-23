const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Transpile @supabase packages so Babel converts dynamic import() to require()
// which Hermes supports. Without this, import(variable) in supabase's optional
// OpenTelemetry integration causes hermesc to fail.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?(\/.+)?|nativewind|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context|@supabase)/)' ,
];

// Stub out @opentelemetry/api — supabase tries to load it optionally via
// dynamic import; we provide an empty module so require() succeeds at runtime.
config.resolver.extraNodeModules = {
  '@opentelemetry/api': path.resolve(__dirname, './otel-mock.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
