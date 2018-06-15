'use strict';

/**
 * @file Functions for dealing with planner data
 * @module planner
 */
const _ = require('underscore');
const checkedEvents = require(__dirname + '/checkedEvents.js');
const classes = require(__dirname + '/classes.js'); // eslint-disable-line
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

async function upsertEvent(db, user, plannerEvent) {
	// Validate inputs
	if (typeof db   !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid user!');

	if (typeof plannerEvent         !== 'object') throw new Error('Invalid event object!');
	if (typeof plannerEvent._id     !== 'string') plannerEvent._id = '';
	if (typeof plannerEvent.title   !== 'string') throw new Error('Invalid event title!');
	if (typeof plannerEvent.desc    !== 'string') plannerEvent.desc = '';
	if (typeof plannerEvent.classId !== 'string') plannerEvent.classId = null;
	if (typeof plannerEvent.start   !== 'object') throw new Error('Invalid event start!');
	if (typeof plannerEvent.end     !== 'object') throw new Error('Invalid event end!');
	if (typeof plannerEvent.link    !== 'string') plannerEvent.link = '';

	// Made sure start time and end time are consecutive or the same
	if (plannerEvent.start.getTime() > plannerEvent.end.getTime()) throw new Error('Start and end time are not consecutive!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('Invalid username!');

	const classes = await classes.get(db, user);

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
	if (plannerEvent._id !== '') {
		// Check if edit id is valid
		let events;
		try {
			events = await plannerdata.find({ user: userDoc['_id'] }).toArray();
		} catch (e) {
			throw new Error('There was a problem querying the database!');
		}

		// Look through all events if id is valid
		for (const event of events) {
			const eventId = event['_id'];
			if (plannerEvent._id === eventId.toHexString()) {
				validEditId = eventId;
				break;
			}
		}
	}

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
	try {
		await plannerdata.updateOne({ _id: id }, insertEvent, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem inserting the event into the database!');
	}

	return insertEvent;
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

async function deleteEvent(db, user, eventId) {
	if (typeof db   !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid user!');

	// Try to create object id
	let id;
	try {
		id = new ObjectID(eventId);
	} catch (e) {
		throw new Error('Invalid event id!');
	}

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('Invalid username!');

	const plannerdata = db.collection('planner');

	// Delete all events with specified id
	try {
		await plannerdata.deleteMany({ _id: id, user: userDoc['_id'] });
	} catch (e) {
		throw new Error('There was a problem deleting the event from the database!');
	}
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

async function getEvents(db, user) {
	if (typeof db   !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid user!');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const plannerdata = db.collection('planner');

	const [events, checkedEventsList, classes] = await Promise.all([
		plannerdata.find({ user: userDoc['_id'] }).toArray().catch(() => {
			throw new Error('There was a problem querying the database!');
		}),
		checkedEvents.list(db, user),
		classes.get(db, user)
	]);

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

	return events;
}

module.exports.upsert = upsertEvent;
module.exports.delete = deleteEvent;
module.exports.get    = getEvents;
