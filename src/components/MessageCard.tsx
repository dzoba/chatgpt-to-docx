import { useState } from "react";
import Markdown from "react-markdown";
import type { Message } from "../lib/types";

interface MessageCardProps {
  message: Message;
  selected: boolean;
  onToggle: () => void;
}

const TRUNCATE_LENGTH = 500;

export function MessageCard({ message, selected, onToggle }: MessageCardProps) {
  const isUser = message.role === "user";
  const roleLabel = isUser ? "You" : "ChatGPT";
  const isLong = message.content.length > TRUNCATE_LENGTH;
  const [expanded, setExpanded] = useState(false);

  const displayContent = expanded || !isLong
    ? message.content
    : message.content.slice(0, TRUNCATE_LENGTH) + "...";

  return (
    <div className={`message-card ${isUser ? "user-message" : "assistant-message"} ${selected ? "" : "dimmed"}`}>
      <label className="message-header">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
        />
        <span className={`role-badge ${isUser ? "role-user" : "role-assistant"}`}>
          {roleLabel}
        </span>
      </label>
      <div className="message-content markdown-body">
        <Markdown>{displayContent}</Markdown>
      </div>
      {isLong && (
        <button
          className="expand-toggle"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
          <svg
            className={`expand-icon ${expanded ? "expanded" : ""}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
