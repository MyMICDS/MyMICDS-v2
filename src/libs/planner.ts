import { Db, ObjectID } from 'mongodb';
import { InputError, InternalError } from './errors';
import { Omit } from './utils';
import { PlannerEvent } from '@mymicds/sdk';
import * as classes from './classes';
import * as htmlParser from './htmlParser';
import * as users from './users';

/**
 * Adds/edits a planner event.
 * @param db Database connection.
 * @param user Username.
 * @param plannerEvent Planner event object.
 */
async function upsertEvent(db: Db, user: string, plannerEvent: NewEventData) {
	// Defaults
	if (typeof plannerEvent._id !== 'string') {
		plannerEvent._id = '';
	}
	if (typeof plannerEvent.classId !== 'string') {
		plannerEvent.classId = null;
	}
	if (typeof plannerEvent.link !== 'string') {
		plannerEvent.link = '';
	}

	// Made sure start time and end time are consecutive or the same
	if (plannerEvent.start.getTime() > plannerEvent.end.getTime()) {
		throw new InputError('Start and end time are not consecutive!');
	}

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError('Invalid username!');
	}

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
			throw new InternalError('There was a problem querying the database!', e as Error);
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
		await plannerdata.updateOne({ _id: id }, { $set: insertEvent }, { upsert: true });
	} catch (e) {
		throw new InternalError(
			'There was a problem inserting the event into the database!',
			e as Error
		);
	}

	return insertEvent;
}

/**
 * Deletes a planner event.
 * @param db Database connection.
 * @param user Username.
 * @param eventId Event ID to delete.
 */
async function deleteEvent(db: Db, user: string, eventId: string) {
	// Try to create object id
	let id: ObjectID;
	try {
		id = new ObjectID(eventId);
	} catch (e) {
		throw new InputError('Invalid event id!');
	}

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError('Invalid username!');
	}

	const plannerdata = db.collection('planner');

	// Delete all events with specified id
	try {
		await plannerdata.deleteMany({ _id: id, user: userDoc!._id });
	} catch (e) {
		throw new InternalError(
			'There was a problem deleting the event from the database!',
			e as Error
		);
	}
}

/**
 * Gets all of a user's planner events.
 * @param db Database connection.
 * @param user Username.
 * @returns A list of planner documents, including teacher information.
 */
async function getEvents(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const plannerdata = db.collection<PlannerDBEvent>('planner');

	let events: PlannerEvent[];
	try {
		events = await plannerdata
			.aggregate<PlannerEvent>([
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
							$ne: [
								0,
								{
									$size: '$checked'
								}
							]
						},
						// Add username
						user,
						// If no class document was unwound, just make it null
						class: {
							$ifNull: ['$class', null]
						}
					}
				}
			])
			.toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
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
	_id?: string;
	classId?: string | null;
}

export interface PlannerDBEvent extends BasePlannerEvent {
	_id: ObjectID;
	class: ObjectID;
}

export type NewEventData = Omit<PlannerInputEvent, 'user' | 'link'> & { link?: string };

export { upsertEvent as upsert, deleteEvent as delete, getEvents as get };
