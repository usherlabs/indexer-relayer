import environment from "@/config/env";
import { PostgresHelper } from "@/lib/client";
import { isConfigValid } from "@/utils/functions/validator";

export async function startNode() {
  if (!isConfigValid(environment))
    throw new Error("INVALID_CONFIG: all config variables not set");

  const { postgresConnectionString, evmPrivateKey } = environment;

  // validate that the connection string was set as an env variable
  const postgresClient = new PostgresHelper(
    postgresConnectionString,
    evmPrivateKey,
    { env: environment.env }
  );

  // listen for new insertions into the database
  await postgresClient.listen();
}
