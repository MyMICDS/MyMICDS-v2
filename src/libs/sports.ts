import { GetScoresResponse } from '@mymicds/sdk';
import * as request from 'request-promise-native';
import config from './config';

const schoolId = 231;

/**
 * Logs in the Rams Army app with the configured credentials and returns a loginKey
 * @function login
 *
 * @param {loginCallback} callback - Callback
 */

/**
 * Returns a loginKey
 * @callback loginCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} loginKey - Login key to be passed in with all API requests to Rams Army app. Null if error.
 */

async function login() {
	let err: Error;
	let body: any;
	try {
		body = await request.post({
			url: 'https://api.superfanu.com/5.0.0/gen/login.php',
			form: {
				user: config.ramsArmy.user,
				pass: config.ramsArmy.pass
			}
		});
	} catch (e) {
		err = e;
	}

	body = JSON.parse(body);
	if (err! || body.response !== 'ok') {
		const error = body.error ? body.error : 'Unknown';
		throw new Error('There was a problem logging in the Rams Army app! Error: ' + error);
	}

	return body.loginkey;
}

/**
 * Returns all the sports games scores for MICDS
 * @function getScores
 *
 * @param {getScoresCallback} callback - Callback
 */

/**
 * Returns an object containing all the scores
 * @callback getScoresCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} scores - Scores for MICDS games. Null if error.
 */

async function getScores() {
	const loginKey = await login();

	let body;
	try {
		body = await request.post({
			url: 'https://api.superfanu.com/5.0.0/gen/get_scores.php?nid=' + schoolId,
			form: {
				login_key: loginKey
			}
		});
	} catch (e) {
		throw new Error('There was a problem logging in the Rams Army app!');
	}

	const scores: GetScoresResponse['scores'] = {
		scores: body.scores,
		events: body.events
	};

	return scores;
}

export {
	getScores as scores
};
