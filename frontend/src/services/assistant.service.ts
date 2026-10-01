import type { Circuit } from "../domain";
import { ApiError, type IHttpClient, type RequestOptions } from "./http";

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

export interface ProviderOption {
  name: string;
  default_model: string;
  models: string[];
}

export interface AssistantProviders extends AssistantStatus {
  providers: ProviderOption[];
}

export interface AssistantChatOptions {
  provider?: string | null;
  model?: string | null;
}

export interface AssistantStreamHandlers {
  onToken: (text: string) => void;
  onDone: (reply: AssistantReply) => void;
}

function parseSseBlock(block: string): { event: string; data: Record<string, unknown> } | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) as Record<string, unknown> };
  } catch {
    return null;
  }
}

export class AssistantService {
  constructor(
    private readonly http: IHttpClient,
    private readonly baseUrl = "/v1/api",
  ) {}

  status(request?: RequestOptions): Promise<AssistantStatus> {
    return this.http.get<AssistantStatus>("/assistant/status", request);
  }

  providers(request?: RequestOptions): Promise<AssistantProviders> {
    return this.http.get<AssistantProviders>("/assistant/providers", request);
  }

  chat(
    messages: ChatMessage[],
    circuit: Circuit | null,
    options?: AssistantChatOptions,
    request?: RequestOptions,
  ): Promise<AssistantReply> {
    return this.http.post<AssistantReply>(
      "/assistant/chat",
      { messages, circuit, provider: options?.provider ?? null, model: options?.model ?? null },
      request,
    );
  }

  // Stream the reply over SSE: `onToken` fires as the text types, `onDone` with the
  // final reply + built circuit.
  async chatStream(
    messages: ChatMessage[],
    circuit: Circuit | null,
    options: AssistantChatOptions | undefined,
    handlers: AssistantStreamHandlers,
    request?: RequestOptions,
  ): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/assistant/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages,
          circuit,
          provider: options?.provider ?? null,
          model: options?.model ?? null,
        }),
        signal: request?.signal,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new ApiError(0, "Cannot reach the simulation server", String(cause));
    }
    if (!res.ok || !res.body) {
      const raw = await res.text().catch(() => "");
      throw new ApiError(res.status, `${res.status} ${res.statusText}`, raw);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const evt = parseSseBlock(block);
        if (!evt) continue;
        if (evt.event === "token") handlers.onToken(String(evt.data.text ?? ""));
        else if (evt.event === "done") handlers.onDone(evt.data as unknown as AssistantReply);
      }
    }
  }
}
