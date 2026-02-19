import {onRequest} from "firebase-functions/v2/https";
import {parseConversation} from "./fetchConversation";

export const fetchConversation = onRequest(
  {cors: true, timeoutSeconds: 30},
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const {url} = req.body as {url?: string};

    if (!url || typeof url !== "string") {
      res.status(400).json({error: "Missing or invalid 'url' field"});
      return;
    }

    // Validate URL pattern
    const urlPattern = /^https?:\/\/(chat\.openai\.com|chatgpt\.com)\/share\//;
    if (!urlPattern.test(url)) {
      res.status(400).json({
        error:
          "Invalid URL. Please provide a ChatGPT share URL " +
          "(e.g., https://chatgpt.com/share/...)",
      });
      return;
    }

    // Normalize to chatgpt.com
    const normalizedUrl = url.replace(
      "chat.openai.com",
      "chatgpt.com"
    );

    try {
      const conversation = await parseConversation(normalizedUrl);
      res.json({conversation});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({error: message});
    }
  }
);
