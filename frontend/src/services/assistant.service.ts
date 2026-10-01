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

export interface AssistantStatus {
  configured: boolean;
  provider?: string | null;
  model?: string | null;
}

export class AssistantService {
  constructor(private readonly http: IHttpClient) {}

  status(request?: RequestOptions): Promise<AssistantStatus> {
    return this.http.get<AssistantStatus>("/assistant/status", request);
  }

  chat(messages: ChatMessage[], circuit: Circuit | null, request?: RequestOptions): Promise<AssistantReply> {
    return this.http.post<AssistantReply>("/assistant/chat", { messages, circuit }, request);
  }
}
