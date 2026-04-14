const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function isMtlsEnabled() {
  return parseBool(process.env.MTLS_ENABLED, false);
}

function getServiceName(fallback = "service") {
  return process.env.MTLS_SERVICE_NAME || process.env.SERVICE_NAME || fallback;
}

function resolvePath(filePath) {
  return filePath ? path.resolve(filePath) : null;
}

function readPemFile(filePath, label) {
  const resolved = resolvePath(filePath);
  if (!resolved) {
    throw new Error(`${label} is required when MTLS_ENABLED=true`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved);
}

function resolveMaterialPaths(serviceNameFallback = "service") {
  const serviceName = getServiceName(serviceNameFallback);
  const certDir = process.env.MTLS_CERT_DIR || "/etc/mtls";

  const defaultCaPath = path.join(certDir, "ca.crt");
  const defaultCertPath = path.join(certDir, `${serviceName}.crt`);
  const defaultKeyPath = path.join(certDir, `${serviceName}.key`);

  const certPath = process.env.MTLS_CERT_PATH || defaultCertPath;
  const keyPath = process.env.MTLS_KEY_PATH || defaultKeyPath;

  return {
    clientCertPath: process.env.MTLS_CLIENT_CERT_PATH || certPath,
    clientKeyPath: process.env.MTLS_CLIENT_KEY_PATH || keyPath,
    serverCertPath: process.env.MTLS_SERVER_CERT_PATH || certPath,
    serverKeyPath: process.env.MTLS_SERVER_KEY_PATH || keyPath,
    caPath: process.env.MTLS_CA_CERT_PATH || defaultCaPath,
  };
}

function maybeReadCa(caPath, rejectUnauthorized) {
  const resolved = resolvePath(caPath);
  if (!resolved || !fs.existsSync(resolved)) {
    if (rejectUnauthorized) {
      throw new Error(
        `MTLS_CA_CERT_PATH file not found and MTLS_REJECT_UNAUTHORIZED=true: ${resolved || caPath}`
      );
    }
    return undefined;
  }
  return fs.readFileSync(resolved);
}

function buildClientTlsOptions(serviceNameFallback = "service") {
  if (!isMtlsEnabled()) {
    return null;
  }

  const paths = resolveMaterialPaths(serviceNameFallback);
  const rejectUnauthorized = parseBool(process.env.MTLS_REJECT_UNAUTHORIZED, true);
  const ca = maybeReadCa(paths.caPath, rejectUnauthorized);

  return {
    cert: readPemFile(paths.clientCertPath, "MTLS_CLIENT_CERT_PATH"),
    key: readPemFile(paths.clientKeyPath, "MTLS_CLIENT_KEY_PATH"),
    ca,
    rejectUnauthorized,
    passphrase: process.env.MTLS_CLIENT_KEY_PASSPHRASE,
    keepAlive: true,
  };
}

function buildServerTlsOptions(serviceNameFallback = "service") {
  if (!isMtlsEnabled()) {
    return null;
  }

  const paths = resolveMaterialPaths(serviceNameFallback);
  const requestCert = parseBool(process.env.MTLS_REQUIRE_CLIENT_CERT, true);
  const rejectUnauthorized = requestCert
    ? parseBool(process.env.MTLS_REJECT_UNAUTHORIZED, true)
    : false;
  const ca = maybeReadCa(paths.caPath, rejectUnauthorized);

  return {
    cert: readPemFile(paths.serverCertPath, "MTLS_SERVER_CERT_PATH"),
    key: readPemFile(paths.serverKeyPath, "MTLS_SERVER_KEY_PATH"),
    ca,
    requestCert,
    rejectUnauthorized,
    passphrase: process.env.MTLS_SERVER_KEY_PASSPHRASE || process.env.MTLS_CLIENT_KEY_PASSPHRASE,
    minVersion: process.env.MTLS_MIN_VERSION || "TLSv1.2",
  };
}

const httpsAgentCache = new Map();

function getHttpsAgent(serviceNameFallback = "service") {
  if (!isMtlsEnabled()) {
    return null;
  }

  const cacheKey = getServiceName(serviceNameFallback);
  if (!httpsAgentCache.has(cacheKey)) {
    httpsAgentCache.set(cacheKey, new https.Agent(buildClientTlsOptions(serviceNameFallback)));
  }
  return httpsAgentCache.get(cacheKey);
}

function toInternalUrl(url) {
  if (!isMtlsEnabled() || typeof url !== "string") {
    return url;
  }
  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }
  return url;
}

function withMtlsAxiosConfig(config = {}, serviceNameFallback = "service") {
  const next = { ...config };

  if (typeof next.url === "string") {
    next.url = toInternalUrl(next.url);
  }

  if (!isMtlsEnabled()) {
    return next;
  }

  next.httpsAgent = getHttpsAgent(serviceNameFallback);
  if (next.proxy === undefined) {
    next.proxy = false;
  }
  return next;
}

function enhanceAxiosClient(client, serviceNameFallback = "service") {
  client.interceptors.request.use((config) => withMtlsAxiosConfig(config, serviceNameFallback));
  return client;
}

function createServer(handler, serviceNameFallback = "service") {
  if (!isMtlsEnabled()) {
    return {
      server: http.createServer(handler),
      protocol: "http",
    };
  }

  return {
    server: https.createServer(buildServerTlsOptions(serviceNameFallback), handler),
    protocol: "https",
  };
}

function startServer(handler, port, serviceNameFallback = "service", onListening) {
  const { server, protocol } = createServer(handler, serviceNameFallback);
  server.listen(port, () => {
    if (typeof onListening === "function") {
      onListening({ protocol, port });
      return;
    }
    console.log(`${serviceNameFallback} running on ${protocol}://0.0.0.0:${port}`);
  });
  return { server, protocol };
}

module.exports = {
  isMtlsEnabled,
  toInternalUrl,
  withMtlsAxiosConfig,
  enhanceAxiosClient,
  getHttpsAgent,
  createServer,
  startServer,
};
