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
 * @param envName Name of environment to check (if key vault isn't available)
 * @param vaultName Name of secret in Azure Key Vault (production only)
 * @param defaultValue Local default value if nothing's available
 *
 * @returns Resolved config value
 */
async function resolveConfigWithKeyvault<T>(envName: string, vaultName: string, defaultValue: T) {
	// First, check if we should use Azure Keyvault
	if (client) {
		return (await client.getSecret(vaultName)).value;
	}

	// Next, check if the environment variable is set
	if (process.env[envName]) {
		return process.env[envName];
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
		URI: resolveConfigWithKeyvault('EMAIL_URI', 'emailUri', ''),
		fromEmail: resolveConfig('EMAIL_FROM', 'support@mymicds.net'),
		fromName: resolveConfig('EMAIL_NAME', 'MyMICDS Support')
	},

	jwt: {
		secret: resolveConfigWithKeyvault('JWT_SECRET', 'jwtSecret', 'flexvimsans')
	},

	mongodb: {
		uri: resolveConfigWithKeyvault(
			'MONGODB_URI',
			'mongodbUri',
			'mongodb://mymicds-stager:passtheword@mongo:27017/mymicds-staging'
		)
	},

	openWeather: {
		APIKey: resolveConfigWithKeyvault('OPEN_WEATHER_API_KEY', 'openWeatherApiKey', '')
	},

	portal: {
		dayRotation: resolveConfigWithKeyvault('PORTAL_DAY_ROTATION', 'portalDayRotation', '') // School Calendars > All School Events on Veracross
	},

	googleServiceAccount: resolveConfigWithKeyvault(
		'GOOGLE_SERVICE_ACCOUNT',
		'googleServiceAccount',
		'{}'
	).then(v =>
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		JSON.parse(v as string)
	)
};
