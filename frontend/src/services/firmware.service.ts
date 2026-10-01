import type { IHttpClient, RequestOptions } from "./http";

export interface FirmwareCheck {
  ok: boolean;
  error?: string | null;
  line?: number | null;
}

export class FirmwareService {
  constructor(private readonly http: IHttpClient) {}

  check(source: string, request?: RequestOptions): Promise<FirmwareCheck> {
    return this.http.post<FirmwareCheck>("/firmware/check", { source }, request);
  }
}
