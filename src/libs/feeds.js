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

function updateCanvasCache(db, user, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	const canvasdata = db.collection('canvasFeeds');

	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err);
			return;
		}
		if (!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		canvas.getUserCal(db, userDoc.user, (err, hasURL, events) => {
			if (err) {
				callback(err);
				return;
			}

			canvasdata.deleteMany({ user: userDoc._id }, err => {
				if (err) {
					callback('There was an error removing the old events from the database!');
					return;
				}

				events.forEach(e => e.user = userDoc._id);

				canvasdata.insertMany(events, err => {
					if (err) {
						callback('There was an error inserting events into the database!');
						return;
					}

					callback(null);
				});
			});
		});
	});
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

function addPortalQueue(db, user, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err, null);
			return;
		}
		if (!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		const portaldata = db.collection('portalFeeds');
		const userdata   = db.collection('users');

		portal.getFromCal(db, user, (err, hasURL, events) => {
			if (err) {
				callback(err, null);
				return;
			}
			if (_.isEmpty(events)) {
				userdata.update({ user }, { $set: { inPortalQueue: true } }, err => {
					if (err) {
						callback(new Error('There was an error adding the user to the queue!'), null);
						return;
					}

					callback(null, events);
				});
				return;
			}

			portaldata.deleteMany({ user: userDoc._id }, err => {
				if (err) {
					callback(new Error('There was an error removing the old events from the database!'), null);
					return;
				}

				events.forEach(e => e.user = userDoc._id);

				portaldata.insertMany(events, err => {
					if (err) {
						callback(new Error(`There was an error inserting events into the database! (${err})`), null);
						return;
					}

					userdata.update({ user }, { $set: { inPortalQueue: false } }, err => {
						if (err) {
							callback(new Error('There was an error removing the user from the queue!'), null);
							return;
						}

						callback(null, events);
					});
				});
			});
		});
	});
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

function processPortalQueue(db, callback) {
	if (typeof callback !== 'function') return;

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	const userdata = db.collection('users');

	userdata.find({ inPortalQueue: true }).toArray((err, queue) => {
		if (err) {
			callback(new Error('There was a problem querying the database!'));
			return;
		}

		function handleQueue(i) {
			if (i >= queue.length) {
				callback(null);
				return;
			}

			addPortalQueue(db, queue[i].user, err => {
				if (err) {
					callback(err);
					return;
				}

				handleQueue(++i);
			});
		}

		handleQueue(0);
	});
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

function canvasCacheRetry(db, user, callback) {
	if (typeof callback !== 'function') return;

	canvas.getFromCache(db, user, (err, hasURL, events) => {
		if (err) {
			callback(err, null, null);
			return;
		}
		if (!hasURL || !events || events.length > 0) {
			callback(null, hasURL, events);
			return;
		}

		// If the events are empty, there's a chance that we just didn't cache results yet
		updateCanvasCache(db, user, err => {
			if (err) {
				callback(err, null, null);
				return;
			}

			canvas.getFromCache(db, user, callback);
		});
	});
}

module.exports.updateCanvasCache  = updateCanvasCache;
module.exports.addPortalQueue     = addPortalQueue;
module.exports.processPortalQueue = processPortalQueue;
module.exports.canvasCacheRetry  = canvasCacheRetry;
