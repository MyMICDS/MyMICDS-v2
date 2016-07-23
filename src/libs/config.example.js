'use strict';

/*
 * This is where all of our sensitive information is stored.
 * DO NOT MODIFY THIS DOCUMENT. Instead, create a 'config.js' with the filled out information.
 * Require the requireconfig.js in order to use this JSON data.
 */

module.exports =
{
	port: 1420,
	hostedOn: 'http://localhost:1420', // URL to access this server. Used for signing JWT's

	email: {
		URI      : '',
		fromEmail: 'support@mymicds.net',
		fromName : 'MyMICDS Support',
	},

	forecast: {
		APIKey: ''
	},

	jwt: {
		secret: 'flexvimsans'
	},

	mongodb: {
		uri: ''
	},

	portal: {
		dayRotation: ''
	},

	googleServiceAccount:
	{
		'type': '',
		'project_id': '',
		'private_key_id': '',
		'private_key': '',
		'client_email': '',
		'client_id': '',
		'auth_uri': '',
		'token_uri': '',
		'auth_provider_x509_cert_url': '',
		'client_x509_cert_url': ''
	}
}
