import {Message, Conversation} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message?: {
    id: string;
    author: { role: string };
    content: { content_type: string; parts?: string[] };
    create_time?: number;
    metadata?: { is_visually_hidden_from_conversation?: boolean };
  } | null;
}

/** Strip ChatGPT internal markers: citation refs, sandbox URLs, sediment URLs */
function cleanContent(text: string): string {
  return text
    // Citation markers: \ue200cite\ue202turn0searchN\ue201 and variants
    .replace(/[\ue200-\ue2ff]cite[\ue200-\ue2ff][^\ue200-\ue2ff]*[\ue200-\ue2ff]/g, "")
    // Broader private-use Unicode char cleanup (leftover markers)
    .replace(/[\ue200-\ue2ff]+/g, "")
    // sandbox:/mnt/data/... file references
    .replace(/\[?sandbox:\/mnt\/data\/[^\s)\]]*\]?/g, "")
    // sediment://file_... references
    .replace(/sediment:\/\/file_[^\s)"]*/g, "")
    // (Reference: ...) blocks left empty after stripping
    .replace(/\(Reference:\s*\)/g, "")
    // Clean up multiple blank lines left behind
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function traverseTree(
  mapping: Record<string, MappingNode>,
  currentNode: string
): Message[] {
  const messages: Message[] = [];
  let nodeId: string | null = currentNode;

  while (nodeId) {
    const node: MappingNode | undefined = mapping[nodeId];
    if (!node) break;

    if (
      node.message &&
      node.message.content &&
      node.message.content.parts &&
      (node.message.author.role === "user" ||
        node.message.author.role === "assistant")
    ) {
      // Skip hidden messages (e.g. "Original custom instructions no longer available")
      if (node.message.metadata?.is_visually_hidden_from_conversation) {
        nodeId = node.parent;
        continue;
      }

      const rawContent = node.message.content.parts
        .filter((p: any) => typeof p === "string")
        .join("\n");
      const content = cleanContent(rawContent);
      if (content.trim() &&
          content.trim() !== "Original custom instructions no longer available") {
        messages.push({
          id: node.message.id,
          role: node.message.author.role as "user" | "assistant",
          content,
          timestamp: node.message.create_time,
        });
      }
    }

    nodeId = node.parent;
  }

  return messages.reverse();
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {"User-Agent": USER_AGENT},
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Resolve a value from the React Router turbo-stream flat array.
 * Reference objects like {"_39": 40} mean: key is at data[39], value is at data[40].
 */
function resolveValue(data: any[], idx: number, depth = 0): any {
  if (depth > 50 || idx < 0 || idx >= data.length) return null;
  const val = data[idx];

  if (val !== null && typeof val === "object" && !Array.isArray(val)) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith("_")) {
        const keyIdx = parseInt(k.slice(1), 10);
        const resolvedKey = data[keyIdx];
        result[String(resolvedKey)] = resolveValue(data, v as number, depth + 1);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  if (Array.isArray(val)) {
    return val.map((item) =>
      typeof item === "number" ? resolveValue(data, item, depth + 1) : item
    );
  }

  return val;
}

// Strategy 1: React Router turbo-stream (current ChatGPT format)
function tryTurboStream(html: string): Conversation | null {
  // Extract the streamController.enqueue payload
  const startMarker = 'streamController.enqueue("';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;

  const contentStart = startIdx + startMarker.length - 1; // include the opening quote
  let pos = contentStart + 1; // skip opening quote
  while (pos < html.length) {
    if (html[pos] === "\\") {
      pos += 2; // skip escaped char
    } else if (html[pos] === '"') {
      break;
    } else {
      pos++;
    }
  }

  const rawJsString = html.slice(contentStart, pos + 1); // include both quotes

  try {
    const decoded: string = JSON.parse(rawJsString);
    const data: any[] = JSON.parse(decoded);

    // Find "serverResponse" key in the flat array, then resolve the
    // reference object that follows it to get the conversation data.
    let serverResponseData: any = null;
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === "serverResponse") {
        const resolved = resolveValue(data, i + 1);
        serverResponseData = resolved?.data || resolved;
        break;
      }
    }

    if (!serverResponseData || !serverResponseData.mapping) return null;

    const title: string = serverResponseData.title || "Untitled Conversation";
    const mapping: Record<string, MappingNode> = serverResponseData.mapping;

    // Find current_node - it's stored via a reference in the serverResponse
    // object. Search for it by finding the "current_node" key.
    let currentNode: string | null = serverResponseData.current_node || null;

    if (!currentNode) {
      // Fallback: find current_node by scanning the flat array directly
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === "current_node") {
          const candidate = data[i + 1];
          // It might be a direct value or a reference index
          if (typeof candidate === "string" && mapping[candidate]) {
            currentNode = candidate;
            break;
          }
          // Try resolving it as an index
          if (typeof candidate === "number") {
            const resolved = data[candidate];
            if (typeof resolved === "string" && mapping[resolved]) {
              currentNode = resolved;
              break;
            }
          }
        }
      }
    }

    if (!currentNode) {
      // Last resort: find a leaf node (one with no children or whose children
      // aren't in the mapping — i.e., the end of the conversation)
      for (const [id, node] of Object.entries(mapping)) {
        const n = node as MappingNode;
        if (!n.children || n.children.length === 0) {
          currentNode = id;
          break;
        }
        const hasChildInMapping = n.children.some((c) => mapping[c]);
        if (!hasChildInMapping) {
          currentNode = id;
          break;
        }
      }
    }

    if (!currentNode) return null;

    const messages = traverseTree(mapping, currentNode);
    if (messages.length === 0) return null;

    return {title, messages};
  } catch {
    return null;
  }
}

// Strategy 2: __NEXT_DATA__ script tag (legacy format)
function tryNextData(html: string): Conversation | null {
  const match = html.match(
    /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    const serverResponse =
      data?.props?.pageProps?.serverResponse?.data ||
      data?.props?.pageProps?.data;
    if (!serverResponse) return null;

    const title: string = serverResponse.title || "Untitled Conversation";
    const mapping: Record<string, MappingNode> = serverResponse.mapping;
    const currentNode: string = serverResponse.current_node;

    if (!mapping || !currentNode) return null;

    const messages = traverseTree(mapping, currentNode);
    if (messages.length === 0) return null;

    return {title, messages};
  } catch {
    return null;
  }
}

export async function parseConversation(url: string): Promise<Conversation> {
  const html = await fetchHtml(url);

  // Strategy 1: React Router turbo-stream (current format)
  const fromTurboStream = tryTurboStream(html);
  if (fromTurboStream) return fromTurboStream;

  // Strategy 2: __NEXT_DATA__ (legacy format)
  const fromNextData = tryNextData(html);
  if (fromNextData) return fromNextData;

  throw new Error(
    "Could not parse conversation. ChatGPT may have changed their page " +
    "structure, or this share link may be invalid/expired."
  );
}
