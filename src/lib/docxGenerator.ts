import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ShadingType,
  BorderStyle,
  LevelFormat,
  AlignmentType as NumberAlign,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import type { Message } from "./types";

// ── Inline markdown parsing ────────────────────────────────────────────

interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Match: `code`, **bold**, *italic*, __bold__, _italic_
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("`")) {
      segments.push({ text: raw.slice(1, -1), code: true });
    } else if (raw.startsWith("**") || raw.startsWith("__")) {
      segments.push({ text: raw.slice(2, -2), bold: true });
    } else {
      segments.push({ text: raw.slice(1, -1), italic: true });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments;
}

function makeTextRuns(segments: InlineSegment[], fontSize = 22): TextRun[] {
  return segments.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italic,
        font: s.code ? "Courier New" : undefined,
        shading: s.code
          ? { type: ShadingType.CLEAR, color: "auto", fill: "E5E7EB" }
          : undefined,
        size: fontSize,
      })
  );
}

// ── Block-level markdown → docx paragraphs ─────────────────────────────

function markdownToParagraphs(md: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      // Render code block as a single shaded paragraph with line breaks
      const codeRuns: TextRun[] = [];
      codeLines.forEach((cl, idx) => {
        if (idx > 0) codeRuns.push(new TextRun({ break: 1 }));
        codeRuns.push(
          new TextRun({
            text: cl,
            font: "Courier New",
            size: 20,
          })
        );
      });
      paragraphs.push(
        new Paragraph({
          children: codeRuns,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "F3F4F6" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          },
          spacing: { before: 100, after: 100 },
          indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
        })
      );
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_2, // Reserve H1 for conversation title
        2: HeadingLevel.HEADING_3,
        3: HeadingLevel.HEADING_4,
        4: HeadingLevel.HEADING_5,
        5: HeadingLevel.HEADING_6,
        6: HeadingLevel.HEADING_6,
      };
      paragraphs.push(
        new Paragraph({
          children: makeTextRuns(parseInline(headingMatch[2]), 24),
          heading: headingMap[level],
          spacing: { before: 200, after: 100 },
        })
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          },
          spacing: { before: 100, after: 100 },
        })
      );
      i++;
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      const indent = Math.floor(ulMatch[1].length / 2);
      paragraphs.push(
        new Paragraph({
          children: makeTextRuns(parseInline(ulMatch[2])),
          bullet: { level: indent },
          spacing: { after: 40 },
        })
      );
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (olMatch) {
      const indent = Math.floor(olMatch[1].length / 2);
      paragraphs.push(
        new Paragraph({
          children: makeTextRuns(parseInline(olMatch[2])),
          numbering: { reference: "ordered-list", level: indent },
          spacing: { after: 40 },
        })
      );
      i++;
      continue;
    }

    // Empty line → spacing
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph with inline formatting
    paragraphs.push(
      new Paragraph({
        children: makeTextRuns(parseInline(line)),
        spacing: { after: 80 },
      })
    );
    i++;
  }

  return paragraphs;
}

// ── Main generator ─────────────────────────────────────────────────────

export async function generateDocx(
  title: string,
  messages: Message[]
): Promise<void> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (const message of messages) {
    const isUser = message.role === "user";
    const roleLabel = isUser ? "You" : "ChatGPT";
    const roleColor = isUser ? "2563EB" : "16A34A";

    // Role label
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: roleLabel,
            bold: true,
            color: roleColor,
            size: 24,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    // Convert markdown content to formatted paragraphs
    children.push(...markdownToParagraphs(message.content));
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: Array.from({ length: 9 }, (_, i) => ({
            level: i,
            format: LevelFormat.DECIMAL,
            text: `%${i + 1}.`,
            alignment: NumberAlign.START,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (i + 1)), hanging: convertInchesToTwip(0.25) } } },
          })),
        },
      ],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "conversation"}.docx`;
  saveAs(blob, filename);
}
