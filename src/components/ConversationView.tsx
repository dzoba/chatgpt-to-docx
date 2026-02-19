import type { Conversation } from "../lib/types";
import { MessageCard } from "./MessageCard";

interface ConversationViewProps {
  conversation: Conversation;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function ConversationView({
  conversation,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: ConversationViewProps) {
  const selectedCount = selectedIds.size;
  const totalCount = conversation.messages.length;

  return (
    <div className="conversation-view">
      <h2 className="conversation-title">{conversation.title}</h2>
      <p className="conversation-subtitle">
        {totalCount} messages in conversation
      </p>
      <div className="selection-controls">
        <button onClick={onSelectAll}>Select All</button>
        <button onClick={onDeselectAll}>Deselect All</button>
        <span className="count">
          {selectedCount} of {totalCount} selected
        </span>
      </div>
      <div className="message-list">
        {conversation.messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            selected={selectedIds.has(msg.id)}
            onToggle={() => onToggle(msg.id)}
          />
        ))}
      </div>
    </div>
  );
}
