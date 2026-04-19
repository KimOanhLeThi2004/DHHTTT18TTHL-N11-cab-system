const axios = require("axios");

const HEADER_SEPARATOR = Buffer.from("\r\n\r\n", "utf8");
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const OLLAMA_TIMEOUT_MS = Math.max(100, Number(process.env.OLLAMA_TIMEOUT_MS || 60000));
const TOOL_NAME = process.env.OLLAMA_MCP_TOOL || "ollama.generate";

let buffer = Buffer.alloc(0);

function writeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, "utf8");
  process.stdout.write(Buffer.concat([header, payload]));
}

function sendResult(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function buildToolDescriptor() {
  return {
    name: TOOL_NAME,
    description: "Generate text with Ollama /api/generate",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Prompt text sent to the model" },
        model: { type: "string", description: "Model name, defaults to OLLAMA_MODEL" },
        format: { type: "string", description: "Output format sent to Ollama" },
        options: { type: "object", description: "Optional Ollama generation options" },
        timeoutMs: { type: "number", description: "Timeout override in milliseconds" },
      },
      required: ["prompt"],
      additionalProperties: true,
    },
  };
}

function toolError(text) {
  return {
    isError: true,
    content: [{ type: "text", text }],
  };
}

async function handleToolCall(params = {}) {
  if (params.name !== TOOL_NAME) {
    return toolError(`Tool not found: ${params.name}`);
  }

  const args = params.arguments || {};
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  if (!prompt.trim()) {
    return toolError("Missing required field: prompt");
  }

  const model = typeof args.model === "string" && args.model ? args.model : OLLAMA_MODEL;
  const format = typeof args.format === "string" && args.format ? args.format : "json";
  const options = args.options && typeof args.options === "object" ? args.options : {};
  const timeoutMs = Math.max(100, Number(args.timeoutMs || OLLAMA_TIMEOUT_MS));

  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        format,
        options,
      },
      { timeout: timeoutMs }
    );

    const text = response?.data?.response;
    if (typeof text !== "string" || !text.trim()) {
      return toolError("Ollama returned empty response");
    }

    return {
      content: [{ type: "text", text }],
    };
  } catch (err) {
    const message = err?.response?.data?.error || err.message || "unknown_ollama_error";
    return toolError(message);
  }
}

async function handleRequest(message) {
  const { id, method, params = {} } = message;

  if (id === undefined || id === null) {
    return;
  }

  try {
    if (method === "initialize") {
      return sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "ollama-mcp-bridge",
          version: "1.0.0",
        },
      });
    }

    if (method === "tools/list") {
      return sendResult(id, { tools: [buildToolDescriptor()] });
    }

    if (method === "tools/call") {
      const result = await handleToolCall(params);
      return sendResult(id, result);
    }

    sendError(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    sendError(id, -32000, err.message || "Internal MCP server error");
  }
}

function parseFrames(chunk) {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf(HEADER_SEPARATOR);
    if (headerEnd < 0) return;

    const headerText = buffer.slice(0, headerEnd).toString("utf8");
    const lengthMatch = /content-length:\s*(\d+)/i.exec(headerText);
    if (!lengthMatch) {
      buffer = Buffer.alloc(0);
      return;
    }

    const contentLength = Number(lengthMatch[1]);
    const bodyStart = headerEnd + HEADER_SEPARATOR.length;
    const frameEnd = bodyStart + contentLength;
    if (buffer.length < frameEnd) return;

    const rawBody = buffer.slice(bodyStart, frameEnd).toString("utf8");
    buffer = buffer.slice(frameEnd);

    let message;
    try {
      message = JSON.parse(rawBody);
    } catch (_) {
      continue;
    }

    handleRequest(message);
  }
}

process.stdin.on("data", parseFrames);
process.stdin.resume();
