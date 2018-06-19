/**
 * @file Manages Canvas and Portal feeds for caching purposes
 * @module feeds
 */

const _      = require('underscore');
const canvas = require(__dirname + '/canvas.js');
const portal = require(__dirname + '/portal.js');
const users  = require(__dirname + '/users.js');

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

async function updateCanvasCache(db, user) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const canvasdata = db.collection('canvasFeeds');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const { events } = await canvas.getUserCal(db, userDoc.user);

	try {
		await canvasdata.deleteMany({ user: userDoc._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events) {
		ev.user = userDoc._id;
	}

	try {
		await canvasdata.insertMany(events);
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

async function addPortalQueue(db, user) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const portaldata = db.collection('portalFeeds');
	const userdata   = db.collection('users');

	const { cal: events } = await portal.getFromCal(db, user);

	if (_.isEmpty(events)) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueue: true } });
		} catch (e) {
			throw new Error('There was an error adding the user to the queue!');
		}

		return events;
	}

	try {
		await portaldata.deleteMany({ user: userDoc._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events) {
		ev.user = userDoc._id;
	}

	try {
		await portaldata.insertMany(events);
	} catch (e) {
		new Error(`There was an error inserting events into the database! (${e})`);
	}

	try {
		await userdata.updateOne({ user }, { $set: { inPortalQueue: false } });
	} catch (e) {
		throw new Error('There was an error removing the user from the queue!');
	}

	return events;
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

async function processPortalQueue(db) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const userdata = db.collection('users');

	let queue;
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

async function canvasCacheRetry(db, user) {
	const { hasURL, events } = await canvas.getFromCache(db, user);

	if (!hasURL || !events || events.length > 0) return { hasURL, events };

	// If the events are empty, there's a chance that we just didn't cache results yet
	await updateCanvasCache(db, user);

	return canvas.getFromCache(db, user);
}

module.exports.updateCanvasCache  = updateCanvasCache;
module.exports.addPortalQueue     = addPortalQueue;
module.exports.processPortalQueue = processPortalQueue;
module.exports.canvasCacheRetry  = canvasCacheRetry;
