import type { ComponentDef } from "../domain";
import type { IHttpClient, RequestOptions } from "./http";

export class CatalogService {
  constructor(private readonly http: IHttpClient) {}

  list(options?: RequestOptions): Promise<ComponentDef[]> {
    return this.http.get<ComponentDef[]>("/components", options);
  }
}
