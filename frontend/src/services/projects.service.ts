import type { Project, ProjectCreate, ProjectUpdate } from "../domain/project";
import type { IHttpClient, RequestOptions } from "./http";

export class ProjectsService {
  constructor(private readonly http: IHttpClient) {}

  list(request?: RequestOptions): Promise<Project[]> {
    return this.http.get<Project[]>("/projects", request);
  }

  get(id: string, request?: RequestOptions): Promise<Project> {
    return this.http.get<Project>(`/projects/${id}`, request);
  }

  create(payload: ProjectCreate, request?: RequestOptions): Promise<Project> {
    return this.http.post<Project>("/projects", payload, request);
  }

  update(id: string, payload: ProjectUpdate, request?: RequestOptions): Promise<Project> {
    return this.http.patch<Project>(`/projects/${id}`, payload, request);
  }

  remove(id: string, request?: RequestOptions): Promise<void> {
    return this.http.del<void>(`/projects/${id}`, request);
  }
}
