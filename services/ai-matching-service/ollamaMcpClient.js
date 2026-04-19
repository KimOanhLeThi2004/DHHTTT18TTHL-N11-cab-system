const axios = require("axios");
const { spawn } = require("child_process");

const HEADER_SEPARATOR = Buffer.from("\r\n\r\n", "utf8");
const DEFAULT_TIMEOUT_MS = Math.max(100, Number(process.env.OLLAMA_TIMEOUT_MS || 15000));
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
const MCP_RETRIES = Math.max(0, Number(process.env.OLLAMA_MCP_RETRIES || 1));
const MCP_RETRY_BACKOFF_MS = Math.max(
  50,
  Number(process.env.OLLAMA_MCP_RETRY_BACKOFF_MS || 400)
);
const MCP_HTTP_FALLBACK_ENABLED = process.env.OLLAMA_MCP_HTTP_FALLBACK !== "false";

function parseArgs(raw) {
  if (!raw) return [];
  const text = String(raw).trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch (_) {
      // Fall through to shell-like split.
    }
  }

  const tokens = text.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (!tokens) return [];
  return tokens.map((token) => token.replace(/^"(.*)"$/, "$1"));
}

function selectToolName(tools = [], preferredName) {
  if (!Array.isArray(tools) || !tools.length) {
    return preferredName || "ollama.generate";
  }

  if (preferredName && tools.some((tool) => tool?.name === preferredName)) {
    return preferredName;
  }

  const rankedHints = [
    "ollama.generate",
    "generate",
    "ollama_generate",
    "chat",
    "completion",
  ];

  for (const hint of rankedHints) {
    const match = tools.find((tool) =>
      String(tool?.name || "").toLowerCase().includes(hint.toLowerCase())
    );
    if (match?.name) return match.name;
  }

  return tools[0].name;
}

function extractTextContent(content = []) {
  if (!Array.isArray(content)) return null;
  const textParts = content
    .map((part) => (typeof part?.text === "string" ? part.text : null))
    .filter((text) => text !== null);
  if (!textParts.length) return null;
  return textParts.join("\n");
}

class McpStdioSession {
  constructor(child) {
    this.child = child;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.stderr = [];
    this.isClosed = false;

    this.closedPromise = new Promise((resolve) => {
      child.once("close", () => {
        this.isClosed = true;
        this.failAllPending(new Error("MCP process closed"));
        resolve();
      });
    });

    child.stdout.on("data", (chunk) => this.onStdout(chunk));
    child.stderr.on("data", (chunk) => {
      this.stderr.push(chunk.toString("utf8"));
    });
    child.on("error", (err) => {
      this.failAllPending(err);
    });
  }

  getStderr() {
    return this.stderr.join("").trim();
  }

  failAllPending(error) {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  onStdout(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf(HEADER_SEPARATOR);
      if (headerEnd < 0) return;

      const headerText = this.buffer.slice(0, headerEnd).toString("utf8");
      const lengthMatch = /content-length:\s*(\d+)/i.exec(headerText);
      if (!lengthMatch) {
        this.failAllPending(new Error("Invalid MCP frame (missing Content-Length header)"));
        this.buffer = Buffer.alloc(0);
        return;
      }

      const contentLength = Number(lengthMatch[1]);
      const bodyStart = headerEnd + HEADER_SEPARATOR.length;
      const frameEnd = bodyStart + contentLength;
      if (this.buffer.length < frameEnd) return;

      const body = this.buffer.slice(bodyStart, frameEnd).toString("utf8");
      this.buffer = this.buffer.slice(frameEnd);

      let message;
      try {
        message = JSON.parse(body);
      } catch (_) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(message, "id")) {
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        continue;
      }

      this.pending.delete(message.id);
      clearTimeout(pending.timer);

      if (message.error) {
        pending.reject(new Error(message.error.message || "MCP request failed"));
        continue;
      }

      pending.resolve(message.result);
    }
  }

  writeMessage(message) {
    const payload = Buffer.from(JSON.stringify(message), "utf8");
    const header = Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, "utf8");
    this.child.stdin.write(Buffer.concat([header, payload]));
  }

  request(method, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (this.isClosed) {
      return Promise.reject(new Error("MCP process is closed"));
    }

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.writeMessage({ jsonrpc: "2.0", id, method, params });
    });
  }

  notify(method, params = {}) {
    if (this.isClosed) return;
    this.writeMessage({ jsonrpc: "2.0", method, params });
  }

  async close() {
    if (this.isClosed) return;

    try {
      this.child.stdin.end();
    } catch (_) {
      // Ignore.
    }

    if (this.child.exitCode === null && !this.child.killed) {
      this.child.kill();
    }

    await Promise.race([
      this.closedPromise,
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryMcpError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("socket hang up") ||
    message.includes("econnrefused") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
}

async function callOllamaGenerateDirectHttp({
  prompt,
  model,
  format = "json",
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const effectiveTimeout = Math.max(100, Number(timeoutMs) || DEFAULT_TIMEOUT_MS);
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      format,
      options,
    },
    { timeout: effectiveTimeout }
  );

  const text = response?.data?.response;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Ollama returned empty response");
  }
  return text;
}

async function callMcpOnce({
  prompt,
  model,
  format = "json",
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  toolName,
} = {}) {
  const command = process.env.OLLAMA_MCP_COMMAND || "node";
  const args = process.env.OLLAMA_MCP_ARGS
    ? parseArgs(process.env.OLLAMA_MCP_ARGS)
    : ["./ollamaMcpServer.js"];
  const preferredToolName = toolName || process.env.OLLAMA_MCP_TOOL || "ollama.generate";
  const effectiveTimeout = Math.max(100, Number(timeoutMs) || DEFAULT_TIMEOUT_MS);

  const child = spawn(command, args, {
    cwd: __dirname,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const session = new McpStdioSession(child);

  try {
    await session.request(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "ai-matching-service", version: "1.0.0" },
      },
      effectiveTimeout
    );
    session.notify("notifications/initialized", {});

    const listedTools = await session.request("tools/list", {}, effectiveTimeout);
    const selectedTool = selectToolName(listedTools?.tools || [], preferredToolName);
    const result = await session.request(
      "tools/call",
      {
        name: selectedTool,
        arguments: {
          prompt,
          model,
          format,
          options,
          stream: false,
          timeoutMs: effectiveTimeout,
        },
      },
      effectiveTimeout
    );

    if (result?.isError) {
      throw new Error(extractTextContent(result.content) || "MCP tool returned error");
    }

    return extractTextContent(result?.content || []);
  } catch (err) {
    const stderr = session.getStderr();
    if (stderr) {
      err.message = `${err.message}; stderr=${stderr}`;
    }
    throw err;
  } finally {
    await session.close();
  }
}

async function callOllamaGenerateViaMcp({
  prompt,
  model,
  format = "json",
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  toolName,
} = {}) {
  const retryCount = MCP_RETRIES;
  let lastError = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await callMcpOnce({
        prompt,
        model,
        format,
        options,
        timeoutMs,
        toolName,
      });
    } catch (err) {
      lastError = err;
      const shouldRetry = shouldRetryMcpError(err);
      if (!shouldRetry || attempt >= retryCount) {
        break;
      }
      await sleep(MCP_RETRY_BACKOFF_MS * (attempt + 1));
    }
  }

  if (!MCP_HTTP_FALLBACK_ENABLED) {
    throw lastError || new Error("MCP call failed");
  }

  try {
    return await callOllamaGenerateDirectHttp({
      prompt,
      model,
      format,
      options,
      timeoutMs,
    });
  } catch (httpErr) {
    const mcpMsg = lastError?.message || "unknown_mcp_error";
    const httpMsg = httpErr?.message || "unknown_http_error";
    throw new Error(`MCP failed (${mcpMsg}); HTTP fallback failed (${httpMsg})`);
  }
}

module.exports = {
  callOllamaGenerateViaMcp,
};
