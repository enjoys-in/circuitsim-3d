import { AssistantService } from "./assistant.service";
import { CatalogService } from "./catalog.service";
import { FirmwareService } from "./firmware.service";
import { HttpClient } from "./http";
import { ProjectsService } from "./projects.service";
import { SimulationService } from "./simulation.service";

const httpClient = new HttpClient("/v1/api");

export const catalogService = new CatalogService(httpClient);
export const simulationService = new SimulationService(httpClient);
export const projectsService = new ProjectsService(httpClient);
export const assistantService = new AssistantService(httpClient);
export const firmwareService = new FirmwareService(httpClient);

export { ApiError, errorMessage, isAbort } from "./http";
