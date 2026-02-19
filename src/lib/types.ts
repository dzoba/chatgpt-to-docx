export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface Conversation {
  title: string;
  messages: Message[];
}
