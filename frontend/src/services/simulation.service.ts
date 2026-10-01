import type { Circuit, SimulationOptions, SimulationResult } from "../domain";
import type { IHttpClient, RequestOptions } from "./http";

export class SimulationService {
  constructor(private readonly http: IHttpClient) {}

  run(circuit: Circuit, options: SimulationOptions, request?: RequestOptions): Promise<SimulationResult> {
    return this.http.post<SimulationResult>("/simulation/run", { circuit, options }, request);
  }
}
