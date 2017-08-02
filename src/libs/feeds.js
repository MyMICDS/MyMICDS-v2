/**
 * @file Manages Canvas and Portal feeds for caching purposes
 * @module feeds
 */

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
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	const canvasdata = db.collection('canvasFeeds');

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		canvas.getFromURL(db, userDoc.user, (err, hasURL, events) => {
			if(err) {
				callback(err);
				return;
			}

			events.forEach(e => e.user = userDoc._id);
			// console.log(events);

			canvasdata.insertMany(events, err => {
				if(err) {
					callback('There was an error inserting events into the database!');
					return;
				}

				callback(null);
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
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	const portaldata = db.collection('portalFeeds');
	const userdata = db.collection('users');

	userdata.find({ inPortalQueue: true }).toArray((err, queue) => {
		if(err) {
			callback(new Error('There was a problem querying the database!'));
			return;
		}

		function handleQueue(i) {
			if(i >= queue.length) return;

			const userDoc = queue[i];

			portal.getFromCal(db, userDoc.user, (err, hasURL, events) => {
				if(err) {
					callback(err);
					return;
				}

				events.forEach(e => e.user = userDoc._id);
				// console.log(events);

				portaldata.insertMany(events, err => {
					if(err) {
						callback('There was an error inserting events into the database!');
						return;
					}

					callback(null);
				});
			});

			handleQueue(++i);
		}

		handleQueue(0);
	});
}

module.exports.updateCanvasCache  = updateCanvasCache;
module.exports.processPortalQueue = processPortalQueue;
