import type { Circuit } from "../domain";
import type { IHttpClient, RequestOptions } from "./http";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  circuit?: Circuit | null;
  configured: boolean;
  issues?: string[];
}

export class AssistantService {
  constructor(private readonly http: IHttpClient) {}

  status(request?: RequestOptions): Promise<{ configured: boolean }> {
    return this.http.get<{ configured: boolean }>("/assistant/status", request);
  }

  chat(messages: ChatMessage[], circuit: Circuit | null, request?: RequestOptions): Promise<AssistantReply> {
    return this.http.post<AssistantReply>("/assistant/chat", { messages, circuit }, request);
  }
}
