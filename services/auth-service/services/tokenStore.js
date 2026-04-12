const revokedTokens = new Map();

function revokeAccessToken(token, expUnixSec) {
  if (!token) return;
  const expiresAtMs = Number.isFinite(expUnixSec) ? expUnixSec * 1000 : Date.now() + 3600_000;
  revokedTokens.set(token, expiresAtMs);
}

function isAccessTokenRevoked(token) {
  if (!token) return false;
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

module.exports = {
  revokeAccessToken,
  isAccessTokenRevoked,
};
