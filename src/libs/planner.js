'use strict';

/**
 * @file Functions for dealing with planner data
 * @module planner
 */
const _ = require('underscore');
const asyncLib = require('async');
const checkedEvents = require(__dirname + '/checkedEvents.js');
const classes = require(__dirname + '/classes.js');
const htmlParser = require(__dirname + '/htmlParser.js');
const ObjectID = require('mongodb').ObjectID;
const users = require(__dirname + '/users.js');

/**
 * Add/edit event to planner
 * @function upsertEvent
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to insert event under
 * @param {Object} plannerEvent - Event object
 * @param {string} [plannerEvent._id] - Optional id to edit event under
 * @param {string} plannerEvent.title - Main summary/label of the event
 * @param {string} [plannerEvent.desc] - Event description with details (Optional)
 * @param {string} [plannerEvent.classId] - Object ID of associated class (Optional)
 * @param {Object} plannerEvent.start - Javascript date object when event starts
 * @param {Object} plannerEvent.end - Javascript date object when event ends
 * @param {string} [plannerEvent.link] - Link to canvas assignment (Optional)
 *
 * @param {upsertEventCallback} callback - Callback
 */

/**
 * Callback after planner data is upserted
 * @callback upsertEventCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Object} plannerEvent - Object of event that was upserted. Null if error.
 */

function upsertEvent(db, user, plannerEvent, callback) {

	// Validate inputs
	if (typeof callback !== 'function') callback = () => {};

	if (typeof db   !== 'object') { callback(new Error('Invalid database connection!'), null); return; }
	if (typeof user !== 'string') { callback(new Error('Invalid user!'),                null); return; }

	if (typeof plannerEvent         !== 'object') { callback(new Error('Invalid event object!'), null); return; }
	if (typeof plannerEvent._id     !== 'string') plannerEvent._id = '';
	if (typeof plannerEvent.title   !== 'string') { callback(new Error('Invalid event title!'), null); return; }
	if (typeof plannerEvent.desc    !== 'string') plannerEvent.desc = '';
	if (typeof plannerEvent.classId !== 'string') { plannerEvent.classId = null; }
	if (typeof plannerEvent.start   !== 'object') { callback(new Error('Invalid event start!'), null); return; }
	if (typeof plannerEvent.end     !== 'object') { callback(new Error('Invalid event end!'),   null); return; }
	if (typeof plannerEvent.link    !== 'string') plannerEvent.link = '';

	// Made sure start time and end time are consecutive or the same
	if (plannerEvent.start.getTime() > plannerEvent.end.getTime()) {
		callback(new Error('Start and end time are not consecutive!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err, null);
			return;
		}
		if (!isUser) {
			callback(new Error('Invalid username!'), null);
			return;
		}

		classes.get(db, user, (err, classes) => {
			if (err) {
				callback(err, null);
				return;
			}

			// Check if class id is valid if it isn't null already
			let validClassId = null;
			if (plannerEvent.classId !== null) {
				for (const theClass of classes) {
					const classId = theClass['_id'];
					if (plannerEvent.classId === classId.toHexString()) {
						validClassId = classId;
						break;
					}
				}
			}

			const plannerdata = db.collection('planner');

			let validEditId = false;
			if (plannerEvent._id === '') {
				// Just insert event if no id is provided
				insertEvent();
			} else {
				// Check if edit id is valid
				plannerdata.find({ user: userDoc['_id'] }).toArray((err, events) => {
					if (err) {
						callback(new Error('There was a problem querying the database!'), null);
						return;
					}

					// Look through all events if id is valid
					for (const event of events) {
						const eventId = event['_id'];
						if (plannerEvent._id === eventId.toHexString()) {
							validEditId = eventId;
							break;
						}
					}
					insertEvent();
				});
			}

			// Just skip to function if no edit id is provided
			function insertEvent() {

				// Generate an Object ID, or use the id that we are editting
				const id = validEditId ? validEditId : new ObjectID();

				const insertEvent = {
					_id: id,
					user: userDoc['_id'],
					class: validClassId,
					title: plannerEvent.title,
					desc: plannerEvent.desc,
					start: plannerEvent.start,
					end: plannerEvent.end,
					link: plannerEvent.link
				};

				// Insert event into database
				plannerdata.update({ _id: id }, insertEvent, { upsert: true }, err => {
					if (err) {
						callback(new Error('There was a problem inserting the event into the database!'), null);
						return;
					}

					callback(null, insertEvent);

				});
			}
		});
	});
}

/**
 * Deletes events from planner.
 * @function deleteEvent
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username of event to delete
 * @param {string} eventId - Id of event to delete
 * @param {deleteEventCallback} callback - Callback
 */

/**
 * Callback after planner data is deleted
 * @callback deleteEventCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function deleteEvent(db, user, eventId, callback) {

	if (typeof callback !== 'function') {
		callback = () => {};
	}

	if (typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	// Try to create object id
	let id;
	try {
		id = new ObjectID(eventId);
	} catch(e) {
		callback(new Error('Invalid event id!'));
		return;
	}

	// Make sure valid user and get user id
	users.get(db, user, (err, isUser, userDoc) => {
		if (err) {
			callback(err);
			return;
		}
		if (!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		const plannerdata = db.collection('planner');

		// Delete all events with specified id
		plannerdata.deleteMany({ _id: id, user: userDoc['_id'] }, err => {
			if (err) {
				callback(new Error('There was a problem deleting the event from the database!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Gets all the events of a user
 * @function getEvents
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username of events to get
 * @param {getEventsCallback} callback - Callback
 */

/**
 * Callback after getting events
 * @callback getEventsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} events - Array of documents of events, with teacher documents injected. Null if error.
 */

function getEvents(db, user, callback) {
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
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		const plannerdata = db.collection('planner');

		asyncLib.parallel([
			asyncCallback => {
				plannerdata.find({ user: userDoc['_id'] }).toArray((err, events) => {
					if (err) {
						asyncCallback(new Error('There was a problem querying the database!'), null);
					} else {
						asyncCallback(null, events);
					}
				});
			},
			asyncCallback => {
				checkedEvents.list(db, user, asyncCallback);
			},
			asyncCallback => {
				classes.get(db, user, asyncCallback);
			}
		],
		(err, data) => {
			if (err) {
				callback(err, null);
				return;
			}

			const events = data[0];
			const checkedEventsList = data[1];
			const classes = data[2];

			// Format all events
			for (const event of events) {
				// Determine if event should be checked or not
				event.checked = _.contains(checkedEventsList, event._id.toHexString());

				// Set user to username
				event['user'] = userDoc['user'];

				// Have a plaintext description too
				event.descPlaintext = htmlParser.htmlToText(event.desc);

				// Default class to null
				const classId = event['class'];
				event['class'] = null;
				// Go through each class to search for matching id
				if (classId !== null) {
					const classIdHex = classId.toHexString();
					for (const theClass of classes) {
						if (classIdHex === theClass['_id'].toHexString()) {
							event['class'] = theClass;
							break;
						}
					}
				}
			}

			callback(null, events);
		});
	});
}

module.exports.upsert = upsertEvent;
module.exports.delete = deleteEvent;
module.exports.get    = getEvents;
