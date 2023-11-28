import environment from '@/config/env';
import { PostgresHelper } from '@/lib/client';
import { ENV_CONNECTION_STRING_NOT_SET } from '@/utils/errors';
import { isConfigValid } from '@/utils/functions/validator';

export async function startNode() {
	if (!isConfigValid(environment))
		throw new Error('INVALID_CONFIG: all environment variables not set');
	const { postgresConnectionString, evmPrivateKey } = environment;

	// validate that the connection string was set as an env variable
	if (!postgresConnectionString) throw new Error(ENV_CONNECTION_STRING_NOT_SET);
	const postgresClient = new PostgresHelper(
		postgresConnectionString,
		evmPrivateKey
	);

	// listen for new insertions into the databasr
	await postgresClient.listen();
}
