import environment from "@/config/env";
import { Client } from "@/lib/client";
import { isConfigValid } from "@/utils/functions/validator";

export async function startNode() {
  if (!isConfigValid(environment))
    throw new Error("INVALID_CONFIG: all config variables not set");

  const { postgresConnectionString, evmPrivateKey } = environment;

  // validate that the connection string was set as an env variable
  const client = new Client(
    postgresConnectionString,
    evmPrivateKey,
    { env: environment.env }
  );

  // listen for new insertions into the database
  await client.listen();
}
