import { PlannerEvent } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import * as classes from './classes';
import * as htmlParser from './htmlParser';
import * as users from './users';
import { Omit } from './utils';

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

// tslint:disable-next-line:max-line-length
async function upsertEvent(db: Db, user: string, plannerEvent: Omit<PlannerInputEvent, 'user' | 'link'> & { link?: string }) {
	// Validate inputs
	if (typeof db   !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid user!'); }

	if (typeof plannerEvent         !== 'object') { throw new Error('Invalid event object!'); }
	if (typeof plannerEvent._id     !== 'string') { plannerEvent._id = ''; }
	if (typeof plannerEvent.title   !== 'string') { throw new Error('Invalid event title!'); }
	if (typeof plannerEvent.desc    !== 'string') { plannerEvent.desc = ''; }
	if (typeof plannerEvent.classId !== 'string') { plannerEvent.classId = null; }
	if (typeof plannerEvent.start   !== 'object') { throw new Error('Invalid event start!'); }
	if (typeof plannerEvent.end     !== 'object') { throw new Error('Invalid event end!'); }
	if (typeof plannerEvent.link    !== 'string') { plannerEvent.link = ''; }

	// Made sure start time and end time are consecutive or the same
	if (plannerEvent.start.getTime() > plannerEvent.end.getTime()) {
		throw new Error('Start and end time are not consecutive!');
	}

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('Invalid username!'); }

	const theClasses = await classes.get(db, user);

	// Check if class id is valid if it isn't null already
	let validClassId: ObjectID | null = null;
	if (plannerEvent.classId !== null) {
		for (const theClass of theClasses) {
			const classId = theClass._id;
			if (plannerEvent.classId === classId.toHexString()) {
				validClassId = classId;
				break;
			}
		}
	}

	const plannerdata = db.collection<PlannerDBEvent>('planner');

	let validEditId: ObjectID | null = null;
	if (plannerEvent._id !== '') {
		// Check if edit id is valid
		let events: PlannerDBEvent[];
		try {
			events = await plannerdata.find({ user: userDoc!._id }).toArray();
		} catch (e) {
			throw new Error('There was a problem querying the database!');
		}

		// Look through all events if id is valid
		for (const event of events) {
			const eventId = event._id;
			if (plannerEvent._id === eventId.toHexString()) {
				validEditId = eventId;
				break;
			}
		}
	}

	// Generate an Object ID, or use the id that we are editting
	const id = validEditId ? validEditId : new ObjectID();

	const insertEvent: PlannerDBEvent = {
		_id: id,
		user: userDoc!._id,
		class: validClassId!,
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

async function deleteEvent(db: Db, user: string, eventId: string) {
	if (typeof db   !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid user!'); }

	// Try to create object id
	let id: ObjectID;
	try {
		id = new ObjectID(eventId);
	} catch (e) {
		throw new Error('Invalid event id!');
	}

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('Invalid username!'); }

	const plannerdata = db.collection('planner');

	// Delete all events with specified id
	try {
		await plannerdata.deleteMany({ _id: id, user: userDoc!._id });
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

async function getEvents(db: Db, user: string) {
	if (typeof db   !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid user!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const plannerdata = db.collection<PlannerDBEvent>('planner');

	let events: PlannerEvent[];
	try {
		events = await plannerdata.aggregate<PlannerEvent>(
			[
				// Stage 1
				// Get planner events for user
				{
					$match: {
						user: userDoc!._id
					}
				},
				// Stage 2
				// Get associated checked events
				{
					$lookup: {
						from: 'checkedEvents',
						localField: '_id',
						foreignField: 'eventId',
						as: 'checked'
					}
				},
				// Stage 3
				// Get associated classes
				{
					$lookup: {
						from: 'classes',
						localField: 'class',
						foreignField: '_id',
						as: 'class'
					}
				},
				// Stage 4
				// Unwrap class array
				{
					$unwind: {
						path: '$class',
						preserveNullAndEmptyArrays: true
					}
				},
				// Stage 5
				// Additional fields
				{
					$addFields: {
						// If there's no associated checked events, the event is not checked
						checked: {
							$ne: [0, {
								$size: '$checked'
							}]
						},
						// Add username
						user,
						// If no class document was unwound, just make it null
						class: {
							$ifNull: ['$class', null]
						}
					}
				}
			]
		).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	// Format all events
	for (const event of events) {
		// Have a plaintext description too
		event.descPlaintext = htmlParser.htmlToText(event.desc);
	}

	return events;
}

export interface BasePlannerEvent {
	user: ObjectID;
	title: string;
	desc: string;
	start: Date;
	end: Date;
	link: string;
}

export interface PlannerInputEvent extends BasePlannerEvent {
	_id: string;
	classId?: string | null;
}

export interface PlannerDBEvent extends BasePlannerEvent {
	_id: ObjectID;
	class: ObjectID;
}

export {
	upsertEvent as upsert,
	deleteEvent as delete,
	getEvents as get
};
