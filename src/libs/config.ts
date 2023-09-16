/*
 * This is where all of our sensitive information is stored.
 * DO NOT MODIFY THIS DOCUMENT. Instead, create a 'config.ts' with the filled out information.
 */

export default {
	port: process.env.PORT || 1420,
	hostedOn: process.env.HOSTED_ON || 'http://localhost:1420', // URL to access this server. Used for signing JWT's
	production: !!process.env.IS_PRODUCTION, // Whether or not the server is running in production mode. (This enables/disables a few features!)

	forceError: [] as string[], // List of routes to force error responses on. Used for testing.

	email: {
		URI: process.env.EMAIL_URI || '',
		fromEmail: process.env.EMAIL_FROM || 'support@mymicds.net',
		fromName: process.env.EMAIL_NAME || 'MyMICDS Support'
	},

	forecast: {
		APIKey: process.env.FORECAST_API_KEY || ''
	},

	jwt: {
		secret: process.env.JWT_SECRET || 'flexvimsans'
	},

	mongodb: {
		uri:
			process.env.MONGODB_URI ||
			'mongodb://mymicds-stager:passtheword@mongo:27017/mymicds-staging'
	},

	openWeather: {
		APIKey: process.env.OPEN_WEATHER_API_KEY || ''
	},

	portal: {
		dayRotation: process.env.PORTAL_DAY_ROTATION || '' // School Calendars > All School Events on Veracross
	},

	googleServiceAccount: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}')
};
