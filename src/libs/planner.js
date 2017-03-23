'use strict';

/**
 * @file Functions for dealing with planner data
 * @module planner
 */
const _ = require('underscore');
const asyncLib = require('async');
const canvas = require(__dirname + '/canvas.js');
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
	if(typeof callback !== 'function') callback = () => {};

	if(typeof db   !== 'object') { callback(new Error('Invalid database connection!'), null); return; }
	if(typeof user !== 'string') { callback(new Error('Invalid user!'),                null); return; }

	if(typeof plannerEvent         !== 'object') { callback(new Error('Invalid event object!'), null); return; }
	if(typeof plannerEvent._id     !== 'string') plannerEvent._id = '';
	if(typeof plannerEvent.title   !== 'string') { callback(new Error('Invalid event title!'), null); return; }
	if(typeof plannerEvent.desc    !== 'string') plannerEvent.desc = '';
	if(typeof plannerEvent.classId !== 'string') { plannerEvent.classId = null; }
	if(typeof plannerEvent.start   !== 'object') { callback(new Error('Invalid event start!'), null); return; }
	if(typeof plannerEvent.end     !== 'object') { callback(new Error('Invalid event end!'),   null); return; }
	if(typeof plannerEvent.link    !== 'string') plannerEvent.link = '';

	// Made sure start time and end time are consecutive or the same
	if(plannerEvent.start.getTime() > plannerEvent.end.getTime()) {
		callback(new Error('Start and end time are not consecutive!'), null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'), null);
			return;
		}

		classes.get(db, user, (err, classes) => {
			if(err) {
				callback(err, null);
				return;
			}

			// Check if class id is valid if it isn't null already
			let validClassId = null;
			if(plannerEvent.classId !== null) {
				for(let theClass of classes) {
					const classId = theClass['_id'];
					if(plannerEvent.classId === classId.toHexString()) {
						validClassId = classId;
						break;
					}
				}
			}

			const plannerdata = db.collection('planner');

			let validEditId = false;
			if(plannerEvent._id === '') {
				// Just insert event if no id is provided
				insertEvent();
			} else {
				// Check if edit id is valid
				plannerdata.find({ user: userDoc['_id'] }).toArray((err, events) => {
					if(err) {
						callback(new Error('There was a problem querying the database!'), null);
						return;
					}

					// Look through all events if id is valid
					for(let event of events) {
						const eventId = event['_id'];
						if(plannerEvent._id === eventId.toHexString()) {
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
				plannerdata.update({ _id: id }, insertEvent, { upsert: true }, (err, results) => {
					if(err) {
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

	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
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
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid username!'));
			return;
		}

		const plannerdata = db.collection('planner');

		// Delete all events with specified id
		plannerdata.deleteMany({ _id: id, user: userDoc['_id'] }, (err, results) => {
			if(err) {
				callback(new Error('There was a problem deleting the event from the database!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Gets a list of all the events for the month (also gets events for previous month and next month)
 * @function getMonthEvents
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username of events to get
 * @param {Object} date - Object containing month/year to get date. (Inputting an empty object will default to current date)
 * @param {Number} [date.year] - What year to get events in (Optional, defaults to current year)
 * @param {Number} [date.month] - What month to get events. Starts at one. (1 - 12) (Optional, defaults to current month)
 * @param {getMonthEventsCallback} callback - Callback
 */

/**
 * Callback after getting events
 * @callback getMonthEventsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} events - Array of documents of events, with teacher documents injected. Null if error.
 */

function getMonthEvents(db, user, date, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof date !== 'object') {
		callback(new Error('Invalid date object!'), null);
		return;
	}
	// Default month and year to current date
	let current = new Date();

	if(typeof date.month !== 'number' || Number.isNaN(date.month) || date.month < 1 || 12 < date.month || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.year !== 'number' || Number.isNaN(date.month) || date.year % 1 !== 0) {
		date.year = current.getFullYear();
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

		const plannerdata = db.collection('planner');

		asyncLib.parallel([
				asyncCallback => {
					plannerdata.find({ user: userDoc['_id'] }).toArray((err, events) => {
						if(err) {
							asyncCallback(new Error('There was a problem querying the database!'), null);
						} else {
							asyncCallback(null, events);
						}
					});
				},
				asyncCallback => {
					checkedEvents.list(db, user, asyncCallback);
				}
			],
		(err, data) => {
			if(err) {
				callback(err, null);
				return;
			}

			const events = data[0];
			const checkedEventsList = data[1];

			// Go through all events and add all events that are within the month
			const validEvents = [];
			const addedEventIds = [];
			for(let possibleEvent of events) {
				const start = possibleEvent.start;
				const end   = possibleEvent.end;

				const startYear = start.getFullYear();
				const endYear = end.getFullYear();

				// How many months forward and backward to also include events
				const monthPadding = 1;

				// Determine if event should be checked
				possibleEvent.checked = _.contains(checkedEventsList, possibleEvent._id.toHexString());

				// Check previous and next months too
				for(let j = monthPadding * -1; j <= monthPadding; j++) {
					// Check if event was already added
					if(_.contains(addedEventIds, possibleEvent._id)) break;

					const startMonth = start.getMonth() + 1 + j;
					const endMonth = end.getMonth() + 1 + j;

					if((startMonth === date.month && startYear === date.year) || (endMonth === date.month && endYear === date.year)) {
						// If event start or end is in month
						possibleEvent.descPlaintext = htmlParser.htmlToText(possibleEvent.desc);
						validEvents.push(possibleEvent);
						addedEventIds.push(possibleEvent._id);

					} else if ((startMonth < date.month && startYear <= date.year) && (endMonth > date.month && endYear >= date.year)) {
						// If event spans before and after month
						possibleEvent.descPlaintext = htmlParser.htmlToText(possibleEvent.desc);
						validEvents.push(possibleEvent);
						addedEventIds.push(possibleEvent._id);

					}
				}
			}

			// Insert classes in place of class id's
			classes.get(db, user, (err, classes) => {
				if(err) {
					callback(err, null);
					return;
				}

				// Go through each event
				for(let event of validEvents) {
					// Set user to username
					event['user'] = userDoc['user'];
					// Default class to null
					const classId = event['class'];
					event['class'] = null;
					// Go through each class to search for matching id
					if(classId !== null) {
						const classIdHex = classId.toHexString();
						for(let theClass of classes) {
							if(classIdHex === theClass['_id'].toHexString()) {
								event['class'] = theClass;
								break;
							}
						}
					}
				}

				callback(null, validEvents);

			});

		});
	});
}

module.exports.upsertEvent    = upsertEvent;
module.exports.deleteEvent    = deleteEvent;
module.exports.getMonthEvents = getMonthEvents;
