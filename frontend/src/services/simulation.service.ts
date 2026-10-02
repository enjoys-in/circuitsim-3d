import type {
  Circuit,
  SimulationOptions,
  SimulationResult,
  SweepResult,
  VerifyResponse,
  VerifyVector,
} from "../domain";
import type { IHttpClient, RequestOptions } from "./http";

export class SimulationService {
  constructor(private readonly http: IHttpClient) {}

  run(circuit: Circuit, options: SimulationOptions, request?: RequestOptions): Promise<SimulationResult> {
    return this.http.post<SimulationResult>("/simulation/run", { circuit, options }, request);
  }

  verify(
    circuit: Circuit,
    vectors: VerifyVector[],
    options?: { ticks?: number },
    request?: RequestOptions,
  ): Promise<VerifyResponse> {
    return this.http.post<VerifyResponse>(
      "/simulation/verify",
      { circuit, vectors, options },
      request,
    );
  }

  sweep(
    circuit: Circuit,
    params: { instance: string; param: string; start: number; stop: number; steps: number },
    request?: RequestOptions,
  ): Promise<SweepResult> {
    return this.http.post<SweepResult>("/simulation/sweep", { circuit, ...params }, request);
  }
}
