import { CosmosClient } from "@azure/cosmos";
import { getAzureDefaultCredential } from "./azure-default-credential";

export const createProductionCosmosClient = (): CosmosClient => {
  const endpoint = process.env.AZURE_COSMOSDB_URI;
  if (!endpoint) {
    throw new Error(
      "Azure Cosmos DB endpoint is not configured. Please configure it in the .env file.",
    );
  }
  return new CosmosClient({
    endpoint,
    aadCredentials: getAzureDefaultCredential(),
  });
};
