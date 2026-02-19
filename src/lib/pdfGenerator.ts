import jsPDF from "jspdf";
import type { Message } from "./types";

export function generatePdf(title: string, messages: Message[]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  checkPageBreak(titleLines.length * 8);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 8 + 4;

  // Divider line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  for (const message of messages) {
    const isUser = message.role === "user";
    const roleLabel = isUser ? "You" : "ChatGPT";

    checkPageBreak(16);

    // Role label
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    if (isUser) {
      doc.setTextColor(44, 74, 124); // blue
    } else {
      doc.setTextColor(45, 90, 58); // green
    }
    doc.text(roleLabel, margin, y);
    y += 6;

    // Content - strip markdown for clean PDF text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const cleanText = stripMarkdown(message.content);
    const lines = doc.splitTextToSize(cleanText, contentWidth);

    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }

    y += 6;
  }

  const filename = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "conversation"}.pdf`;
  doc.save(filename);
}

function stripMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Inline code
    .replace(/`([^`]+)`/g, "$1")
    // Fenced code blocks - keep content
    .replace(/```[\w]*\n?/g, "")
    // Links [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Horizontal rules
    .replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, "---")
    // List markers
    .replace(/^(\s*)[-*+]\s+/gm, "$1• ")
    .trim();
}
