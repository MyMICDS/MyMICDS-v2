import { Db } from 'mongodb';
import { GetStatsResponse } from '@mymicds/sdk';
import { InternalError } from './errors';
import { UserDoc } from './users';
import moment from 'moment';

/**
 * Collects usage statistics for MyMICDS.
 * @param db Database connection.
 * @returns An object containing different user statistics.
 */
async function getStats(db: Db) {
	const stats: GetStatsResponse['stats'] = {
		registered: {
			total: 0,
			today: 0,
			gradYears: {}
		},
		visitedToday: {
			total: 0,
			gradYears: {}
		}
	};
	const userdata = db.collection<UserDoc>('users');

	// Get all users
	let userDocs: UserDoc[];
	try {
		userDocs = await userdata.find({ confirmed: true }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the users from the database!', e);
	}

	// Get user registered count
	stats.registered.total = userDocs.length;

	// Get array of unique gradYears
	const gradYears: Array<'teacher' | number> = [];
	for (const userDoc of userDocs) {
		let gradYear: 'teacher' | number | null = userDoc.gradYear;

		// If gradYear is null, it's a teacher
		if (gradYear === null) {
			gradYear = 'teacher';
		}

		// If gradYear isn't in the array yet, push to gradYears
		if (!gradYears.includes(gradYear)) {
			gradYears.push(gradYear);
		}
	}

	// First off, set every graduation year to 0 or empty object
	for (const gradYear of gradYears) {
		stats.registered.gradYears[gradYear] = {};
		stats.visitedToday.gradYears[gradYear] = 0;
	}

	// Loop through all the users for when they registered and last time they visited the site
	const today = moment();
	for (const userDoc of userDocs) {
		// If gradYear is null, it's a teacher
		let gradYear: 'teacher' | number | null = userDoc.gradYear;
		if (gradYear === null) {
			gradYear = 'teacher';
		}

		// Get day user registered
		const registered = moment(userDoc.registered);
		const formatRegistered = registered.format('YYYY-MM-DD');

		// Check if user registered today
		if (today.isSame(registered, 'day')) {
			stats.registered.today++;
		}

		stats.registered.gradYears[gradYear][formatRegistered] =
			stats.registered.gradYears[gradYear][formatRegistered] + 1 || 1;

		// Check if user visited today
		if (today.isSame(userDoc.lastVisited, 'day')) {
			stats.visitedToday.total++;
			stats.visitedToday.gradYears[gradYear]++;
		}
	}

	return stats;
}

export { getStats as get };
