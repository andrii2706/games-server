function requireEnv() {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing env variable: ${name}`);
  }
  return value;
}

export const IGDB_CONFIG = Object.freeze({
  BASE_URL: requireEnv("TWITCH_IGDB_LINK"),
  CLIENT_ID: requireEnv("TWITCH_CLIENT_ID"),
  TOKEN: requireEnv("TWITCH_CLIENT_TOKEN"),
});
