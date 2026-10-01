import { CatalogService } from "./catalog.service";
import { HttpClient } from "./http";
import { ProjectsService } from "./projects.service";
import { SimulationService } from "./simulation.service";

const httpClient = new HttpClient("/v1/api");

export const catalogService = new CatalogService(httpClient);
export const simulationService = new SimulationService(httpClient);
export const projectsService = new ProjectsService(httpClient);

export { ApiError, errorMessage, isAbort } from "./http";
