import { Db, ObjectId } from 'mongodb';
import { InputError, InternalError } from './errors';
import * as users from './users';

/**
 * Marks a planner event as complete.
 * @param db Database connection.
 * @param user Username.
 * @param eventId Event ID to check off.
 */
async function checkEvent(db: Db, user: string, eventId: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const checked = await getChecked(db, user, eventId);
	// If already checked, just return null
	if (checked) {
		return null;
	}

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
		throw new InternalError(
			'There was a problem crossing out the event in the database!',
			e as Error
		);
	}
}

/**
 * Determines whether an event is checked off.
 * @param db Database connection.
 * @param user Username.
 * @param eventId Event ID to check.
 */
async function getChecked(db: Db, user: string, eventId: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const checkedEventsData = db.collection('checkedEvents');

	let checkedEvents;
	try {
		checkedEvents = await checkedEventsData.find({ user: userDoc!._id, eventId }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	return checkedEvents.length !== 0;
}

/**
 * Gets all of a user's checked events.
 * @param db Database connection.
 * @param user Username.
 * @returns A list of checked events.
 */
async function listChecked(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const checkedEventsData = db.collection<CheckedEvent>('checkedEvents');

	let checkedEvents: CheckedEvent[];
	try {
		checkedEvents = await checkedEventsData.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	// Append all event ids to array and return
	return checkedEvents.map(c => c.eventId);
}

/**
 * Unchecks an event.
 * @param db Database connection.
 * @param user Username.
 * @param eventId Event ID to uncheck.
 */
async function uncheckEvent(db: Db, user: string, eventId: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const checkedEventsData = db.collection('checkedEvents');

	try {
		await checkedEventsData.deleteMany({ user: userDoc!._id, eventId });
	} catch (e) {
		throw new InternalError(
			'There was a problem uncrossing the event in the database!',
			e as Error
		);
	}
}

export interface CheckedEvent {
	_id: ObjectId;
	user: ObjectId;
	eventId: string;
	checkedTime: Date;
}

export { checkEvent as check, getChecked as get, listChecked as list, uncheckEvent as uncheck };
