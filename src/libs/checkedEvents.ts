import { Db, ObjectID } from 'mongodb';
import * as users from './users';

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

async function checkEvent(db: Db, user: string, eventId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }
	if (typeof eventId !== 'string') { throw new Error('Invalid event id!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const checked = await getChecked(db, user, eventId);
	// If already checked, just return null
	if (checked) { return null; }

	// Insert check into database
	const insertChecked = {
		user: userDoc!._id,
		eventId,
		checkedTime: new Date()
	};

	const checkedEventsData = db.collection('checkedEvents');

	try {
		await checkedEventsData.insertOne(insertChecked);
	} catch (e) {
		throw new Error('There was a problem crossing out the event in the database!');
	}
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

async function getChecked(db: Db, user: string, eventId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }
	if (typeof eventId !== 'string') { throw new Error('Invalid event id!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const checkedEventsData = db.collection('checkedEvents');

	let checkedEvents;
	try {
		checkedEvents = await checkedEventsData.find({ user: userDoc!._id, eventId }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	return checkedEvents.length !== 0;
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

async function listChecked(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const checkedEventsData = db.collection<CheckedEvent>('checkedEvents');

	let checkedEvents: CheckedEvent[];
	try {
		checkedEvents = await checkedEventsData.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	// Append all event ids to array and return
	return checkedEvents.map(c => c.eventId);
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

async function uncheckEvent(db: Db, user: string, eventId: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }
	if (typeof eventId !== 'string') { throw new Error('Invalid event id!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const checkedEventsData = db.collection('checkedEvents');

	try {
		await checkedEventsData.deleteMany({ user: userDoc!._id, eventId });
	} catch (e) {
		throw new Error('There was a problem uncrossing the event in the database!');
	}
}

export interface CheckedEvent {
	_id: ObjectID;
	user: ObjectID;
	eventId: string;
	checkedTime: Date;
}

export {
	checkEvent as check,
	getChecked as get,
	listChecked as list,
	uncheckEvent as uncheck
};
