import { Db} from 'mongodb';
import * as _ from 'underscore';
import { CanvasCalendarWithUser } from './canvas';
import * as canvas from './canvas';
import { PortalCalendarWithUser } from './portal';
import * as portal from './portal';
import { UserDoc } from './users';
import * as users from './users';

/**
 * Update cached Canvas feed for a user
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {updateCanvasCacheCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback updateCanvasCacheCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

export async function updateCanvasCache(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const canvasdata = db.collection('canvasFeeds');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const { events } = await canvas.getUserCal(db, userDoc!.user);

	try {
		await canvasdata.deleteMany({ user: userDoc!._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events!) {
		(ev as any).user = userDoc!._id;
	}

	try {
		await canvasdata.insertMany(events as CanvasCalendarWithUser[]);
	} catch (e) {
		throw new Error('There was an error inserting events into the database!');
	}
}

/**
 * Add a user to the Portal queue
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {addPortalQueueCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback addPortalQueueCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} events - Array of Portal events if success, null if failure
 */

export async function addPortalQueue(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const portaldata = db.collection('portalFeeds');
	const userdata   = db.collection('users');

	const { cal: events } = await portal.getFromCal(db, user);

	if (_.isEmpty(events!)) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueue: true } });
		} catch (e) {
			throw new Error('There was an error adding the user to the queue!');
		}

		return events!;
	}

	try {
		await portaldata.deleteMany({ user: userDoc!._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events!) {
		(ev as any).user = userDoc!._id;
	}

	const newEvents = events as PortalCalendarWithUser[];

	try {
		await portaldata.insertMany(newEvents);
	} catch (e) {
		throw new Error(`There was an error inserting events into the database! (${e})`);
	}

	try {
		await userdata.updateOne({ user }, { $set: { inPortalQueue: false } });
	} catch (e) {
		throw new Error('There was an error removing the user from the queue!');
	}

	return newEvents;
}

/**
 * Process the queue for updating cached Portal feeds
 * @param {Object} db - Database object
 * @param {processPortalQueueCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback processPortalQueueCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

export async function processPortalQueue(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const userdata = db.collection<UserDoc>('users');

	let queue: UserDoc[];
	try {
		queue = await userdata.find({ inPortalQueue: true }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	for (const queueObj of queue) {
		await addPortalQueue(db, queueObj.user);
	}
}

/**
 * Tries to get Canvas calendar from cache. If it's empty, it tries updating the cache and returning that response.
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {canvasCacheRetryCallback} callback - Callback
 */

/**
 * Returns array containing Canvas events
 * @callback canvasCacheRetryCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} hasURL - Whether or not user has a Canvas URL set. Null if error.
 * @param {Array} events - Array of events if success, null if failure.
 */

export async function canvasCacheRetry(db: Db, user: string) {
	const { hasURL, events } = await canvas.getFromCache(db, user);

	if (!hasURL || !events || events.length > 0) { return { hasURL, events }; }

	// If the events are empty, there's a chance that we just didn't cache results yet
	await updateCanvasCache(db, user);

	return canvas.getFromCache(db, user);
}
