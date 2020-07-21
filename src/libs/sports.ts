import { GetScoresResponse } from '@mymicds/sdk';
import * as request from 'request-promise-native';
import config from './config';

const schoolId = 231;

// TODO: Deprecate, possibly remove?

/**
 * Logs into the Rams Army app.
 * @returns A login key to be used with all Rams Army API requests.
 */
async function login() {
	let err: Error;
	let body: { response: string; error: string; loginkey: string };
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

	if (err! || body!.response !== 'ok') {
		const error = body!.error ? body!.error : 'Unknown';
		throw new Error(`There was a problem logging in the Rams Army app! Error: ${error}`);
	}

	return body!.loginkey;
}

/**
 * Retrieves all the sports scores for MICDS.
 * @returns An object containing the scores and events for MICDS sports.
 */
async function getScores() {
	const loginKey = await login();

	let body;
	try {
		body = await request.post({
			url: `https://api.superfanu.com/5.0.0/gen/get_scores.php?nid=${schoolId}`,
			form: {
				login_key: loginKey
			}
		});
	} catch (e) {
		throw new Error('There was a problem logging in the Rams Army app!');
	}

	return {
		scores: body.scores,
		events: body.events
	} as GetScoresResponse['scores'];
}

export { getScores as scores };
