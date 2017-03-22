'use strict';

/**
 * @file Manages checked and unchecked events
 * @module checkedEvents
 */

var users = require(__dirname + '/users.js');

/**
 * Marks an event as complete
 * @function checkEvent
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} eventId - Event id
 * @param {checkEventCallback} callback - Callback
 */

/**
 * Returns if checking event is successful
 * @callback checkEventCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function checkEvent(db, user, eventId, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}
	if(typeof eventId !== 'string') {
		callback(new Error('Invalid event id!'));
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		getChecked(db, user, eventId, (err, checked) => {
			if(err) {
				callback(err);
				return;
			}
			// If already checked, just return null
			if(checked) {
				callback(null);
				return;
			}

			// Insert check into database
			var insertChecked = {
				user: userDoc['_id'],
				eventId: eventId,
				checkedTime: new Date()
			};

			var checkedEventsData = db.collection('checkedEvents');

			checkedEventsData.insert(insertChecked, (err, results) => {
				if(err) {
					callback(new Error('There was a problem crossing out the event in the database!'));
					return;
				}

				callback(null);

			});
		});
	});
}

/**
 * Determines if an event id is checked
 * @function getChecked
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} eventId - Event id
 * @param {getCheckedCallback} callback - Callback
 */

/**
 * Returns if event is checked
 * @callback getCheckedCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} checked - Whether or not event is checked or not
 */

function getChecked(db, user, eventId, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}
	if(typeof eventId !== 'string') {
		callback(new Error('Invalid event id!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		var checkedEventsData = db.collection('checkedEvents');

		checkedEventsData.find({ user: userDoc['_id'], eventId: eventId }).toArray((err, checkedEvents) => {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			callback(null, checkedEvents.length !== 0);

		});
	});
}

/**
 * Returns a list of checked events for user
 * @function listChecked
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {listCheckedCallback} callback - Callback
 */

/**
 * Returns a list of checked events
 * @callback listCheckedCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} checkedEventsList - Array of event ids checked
 */

function listChecked(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		var checkedEventsData = db.collection('checkedEvents');

		checkedEventsData.find({ user: userDoc['_id'] }).toArray((err, checkedEvents) => {
			if(err) {
				callback(new Error('There was a problem querying the database!'), null);
				return;
			}

			// Append all event ids to array
			var checkedEventIds = [];
			for(var i = 0; i < checkedEvents.length; i++) {
				checkedEventIds.push(checkedEvents[i].eventId);
			}

			callback(null, checkedEventIds);

		});
	});
}

/**
 * Unchecks an event
 * @function uncheckEvent
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} eventId - Event id
 * @param {uncheckEventCallback} callback - Callback
 */

/**
 * Returns if unchecking event is successful
 * @callback uncheckEventCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function uncheckEvent(db, user, eventId, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}
	if(typeof eventId !== 'string') {
		callback(new Error('Invalid event id!'));
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		var checkedEventsData = db.collection('checkedEvents');

		checkedEventsData.deleteMany({ user: userDoc['_id'], eventId: eventId }, (err, results) => {
			if(err) {
				callback(new Error('There was a problem uncrossing the event in the database!'));
				return;
			}

			callback(null);

		});
	});
}

module.exports.check   = checkEvent;
module.exports.get     = getChecked;
module.exports.list    = listChecked;
module.exports.uncheck = uncheckEvent;
