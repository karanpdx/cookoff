/**
 * Extends static app.json so env vars are available at build/start via expo.extra.
 * Client code reads the same key from process.env.EXPO_PUBLIC_* (Metro) or Constants.expoConfig.extra.
 */
module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    extra: {
      ...(config.expo?.extra || {}),
      anthropicApiKey:
        process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        '',
    },
  },
});
