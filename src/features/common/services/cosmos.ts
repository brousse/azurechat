import { CosmosClient } from "@azure/cosmos";
import { register, resolve, has, SERVICE_KEYS } from "./service-container";
import { createProductionCosmosClient } from "./cosmos.production";

const DB_NAME = process.env.AZURE_COSMOSDB_DB_NAME || "chat";
const CONTAINER_NAME = process.env.AZURE_COSMOSDB_CONTAINER_NAME || "history";
const CONFIG_CONTAINER_NAME =
  process.env.AZURE_COSMOSDB_CONFIG_CONTAINER_NAME || "config";

// Register the production factory once on module load if no binding has been
// supplied yet (e.g. by instrumentation.ts in test mode). Tests / e2e wiring
// register a stub BEFORE this module is imported, so this branch is a no-op
// there.
if (!has(SERVICE_KEYS.cosmos)) {
  register(SERVICE_KEYS.cosmos, createProductionCosmosClient);
}

export const CosmosInstance = (): CosmosClient =>
  resolve<CosmosClient>(SERVICE_KEYS.cosmos);

export const ConfigContainer = () => {
  return CosmosInstance().database(DB_NAME).container(CONFIG_CONTAINER_NAME);
};

export const HistoryContainer = () => {
  return CosmosInstance().database(DB_NAME).container(CONTAINER_NAME);
};
