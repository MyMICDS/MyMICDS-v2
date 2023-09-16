import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

let client: SecretClient | null = null;
if (process.env.AZURE_KEYVAULT) {
	const credential = new DefaultAzureCredential();
	const url = `https://${process.env.AZURE_KEYVAULT}.vault.azure.net`;
	client = new SecretClient(url, credential);
}

/**
 * Check if a config variable is set, and if not, return the default value.
 *
 * @param name Name of environment variable
 * @param defaultValue  Local default value if nothing's available
 *
 * @returns Resolved config value
 */
function resolveConfig<T>(name: string, defaultValue: T) {
	return process.env[name] || defaultValue;
}

/**
 * Get the proper value for a config variable.
 * Will first try Azure Keyvault, then environment variables, then the default value.
 *
 * @param name Name of environment variable/keyvault secret
 * @param defaultValue Local default value if nothing's available
 *
 * @returns Resolved config value
 */
async function resolveConfigWithKeyvault<T>(name: string, defaultValue: T) {
	// First, check if we should use Azure Keyvault
	if (client) {
		return (await client.getSecret(name)).value;
	}

	// Next, check if the environment variable is set
	if (process.env[name]) {
		return process.env[name];
	}

	// Finally, return the default value
	return defaultValue;
}

export default {
	port: resolveConfig('PORT', 1420),
	hostedOn: resolveConfig('HOSTED_ON', 'http://localhost:1420'), // URL to access this server. Used for signing JWT's
	production: process.env.IS_PRODUCTION?.toLowerCase() === 'true', // Whether or not the server is running in production mode. (This enables/disables a few features!)

	forceError: [] as string[], // List of routes to force error responses on. Used for testing.

	email: {
		URI: resolveConfigWithKeyvault('EMAIL_URI', ''),
		fromEmail: resolveConfig('EMAIL_FROM', 'support@mymicds.net'),
		fromName: resolveConfig('EMAIL_NAME', 'MyMICDS Support')
	},

	forecast: {
		APIKey: resolveConfigWithKeyvault('FORECAST_API_KEY', '')
	},

	jwt: {
		secret: resolveConfigWithKeyvault('JWT_SECRET', 'flexvimsans')
	},

	mongodb: {
		uri: resolveConfigWithKeyvault(
			'MONGODB_URI',
			'mongodb://mymicds-stager:passtheword@mongo:27017/mymicds-staging'
		)
	},

	openWeather: {
		APIKey: resolveConfigWithKeyvault('OPEN_WEATHER_API_KEY', '')
	},

	portal: {
		dayRotation: resolveConfigWithKeyvault('PORTAL_DAY_ROTATION', '') // School Calendars > All School Events on Veracross
	},

	googleServiceAccount: resolveConfigWithKeyvault('GOOGLE_SERVICE_ACCOUNT', '{}').then(v =>
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		JSON.parse(v as string)
	)
};
