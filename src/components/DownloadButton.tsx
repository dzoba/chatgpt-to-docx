import type { Message } from "../lib/types";
import { generateDocx } from "../lib/docxGenerator";
import { generatePdf } from "../lib/pdfGenerator";

interface DownloadButtonProps {
  title: string;
  messages: Message[];
  selectedIds: Set<string>;
}

export function DownloadButton({ title, messages, selectedIds }: DownloadButtonProps) {
  const selectedMessages = messages.filter((m) => selectedIds.has(m.id));
  const disabled = selectedMessages.length === 0;

  return (
    <div className="download-buttons">
      <button
        className="download-button download-docx"
        onClick={() => generateDocx(title, selectedMessages)}
        disabled={disabled}
      >
        <span className="download-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </span>
        .docx
        <span className="download-count">{selectedMessages.length} messages</span>
      </button>
      <button
        className="download-button download-pdf"
        onClick={() => generatePdf(title, selectedMessages)}
        disabled={disabled}
      >
        <span className="download-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </span>
        .pdf
        <span className="download-count">{selectedMessages.length} messages</span>
      </button>
    </div>
  );
}
