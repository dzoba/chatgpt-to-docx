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

export interface FetchRequest {
  url: string;
}

export interface FetchResponse {
  conversation?: Conversation;
  error?: string;
}
