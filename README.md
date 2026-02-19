# ChatGPT to Word

Convert any shared ChatGPT conversation into a formatted `.docx` or `.pdf` document.

**Live at [chatgpt-to-docx.web.app](https://chatgpt-to-docx.web.app)**

## How it works

1. Paste a ChatGPT share URL (e.g. `https://chatgpt.com/share/...`)
2. The app fetches and parses the conversation data server-side
3. Toggle which messages to include
4. Download as `.docx` (with full markdown formatting) or `.pdf`

## Tech stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase Cloud Functions (Node 20)
- **Hosting**: Firebase Hosting
- **DOCX generation**: [docx](https://www.npmjs.com/package/docx) + [file-saver](https://www.npmjs.com/package/file-saver) (client-side)
- **PDF generation**: [jsPDF](https://www.npmjs.com/package/jspdf) (client-side)
- **Markdown rendering**: [react-markdown](https://www.npmjs.com/package/react-markdown)
- **HTML parsing**: [cheerio](https://www.npmjs.com/package/cheerio) (server-side, fallback only)

## Parsing strategy

ChatGPT share pages are SPAs — conversation data isn't in plain HTML. The Cloud Function uses two parsing strategies in cascade:

1. **React Router turbo-stream** (current format): Extracts and deserializes the `streamController.enqueue(...)` payload embedded in the HTML, resolving the positional-reference format to reconstruct the conversation tree.
2. **`__NEXT_DATA__`** (legacy): Parses the Next.js data script tag if present.

The conversation tree is walked from `current_node` back through `parent` pointers to extract messages in chronological order. Junk content (citation markers, sandbox URLs, internal file references) is stripped automatically.

## Local development

```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Terminal 1: Firebase emulators
cd functions && npm run build && cd .. && firebase emulators:start --only functions

# Terminal 2: Vite dev server (proxies /api to emulator)
npm run dev
```

Open `http://localhost:5173`.

## Deploy

```bash
npm run build
cd functions && npm run build && cd ..
firebase deploy
```

## Canary test

A GitHub Actions workflow runs daily to verify the parsing pipeline still works. It hits the deployed Cloud Function with a known share URL and checks for a valid response. If ChatGPT changes their page structure and breaks parsing, the workflow fails and creates a GitHub issue.

See `.github/workflows/canary.yml`.
