import type { Circuit } from "./circuit";

export interface Project {
  id: string;
  name: string;
  description: string;
  circuit: Circuit;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  circuit: Circuit;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  circuit?: Circuit;
}
