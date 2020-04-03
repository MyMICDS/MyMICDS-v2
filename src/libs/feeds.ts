import * as _ from 'lodash';
import { Db } from 'mongodb';
import * as canvas from './canvas';
import { CanvasCacheEvent } from './canvas';
import * as portal from './portal';
import { PortalCacheEvent } from './portal';
import * as users from './users';
import { UserDoc } from './users';

/**
 * Updates a user's Canvas cache data.
 * @param db Database connection.
 * @param user Username.
 */
export async function updateCanvasCache(db: Db, user: string) {
	const canvasdata = db.collection('canvasFeeds');

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const { events } = await canvas.getUserCal(db, userDoc!.user);

	try {
		await canvasdata.deleteMany({ user: userDoc!._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	if (events === null || events.length === 0) { return; }

	const creationDate = new Date();

	for (const ev of events) {
		(ev as any).user = userDoc!._id;
		// Mongo operators don't work for insertMany so set creation time manually
		(ev as any).createdAt = creationDate;
	}

	try {
		await canvasdata.insertMany(events as CanvasCacheEvent[]);
	} catch (e) {
		throw new Error('There was an error inserting events into the database!');
	}
}

/**
 * Adds a user to the Portal classes cache update queue.
 * @param db Database connection.
 * @param user Username.
 * @returns The events that are *currently* in the Portal classes cache, or null if there's no URL.
 */
export async function addPortalQueueClasses(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const portaldata = db.collection<PortalCacheEvent>('portalFeedsClasses');
	const userdata   = db.collection<UserDoc>('users');

	const { cal: events } = await portal.getFromCalClasses(db, user);

	if (events === null) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueueClasses: false } });
		} catch (e) {
			throw new Error('There was an error removing the user from the queue!');
		}

		return events;
	} else if (_.isEmpty(events)) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueueClasses: true } });
		} catch (e) {
			throw new Error('There was an error adding the user to the queue!');
		}

		return events;
	}

	try {
		await portaldata.deleteMany({ user: userDoc!._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events) {
		(ev as any).user = userDoc!._id;
	}

	const newEvents = events as PortalCacheEvent[];

	try {
		await portaldata.insertMany(newEvents);
	} catch (e) {
		throw new Error(`There was an error inserting events into the database! (${e})`);
	}

	try {
		await userdata.updateOne({ user }, { $set: { inPortalQueueClasses: false } });
	} catch (e) {
		throw new Error('There was an error removing the user from the queue!');
	}

	return newEvents;
}

/**
 * Adds a user to the Portal calendar cache update queue.
 * @param db Database connection.
 * @param user Username.
 * @returns The events that are *currently* in the Portal calendar cache, or null if there's no URL.
 */
export async function addPortalQueueCalendar(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const portaldata = db.collection<PortalCacheEvent>('portalFeedsCalendar');
	const userdata   = db.collection<UserDoc>('users');

	const { cal: events } = await portal.getFromCalCalendar(db, user);

	if (events === null) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueueCalendar: false } });
		} catch (e) {
			throw new Error('There was an error removing the user from the queue!');
		}

		return events;
	} else if (_.isEmpty(events)) {
		try {
			await userdata.updateOne({ user }, { $set: { inPortalQueueCalendar: true } });
		} catch (e) {
			throw new Error('There was an error adding the user to the queue!');
		}

		return events!;
	}

	try {
		await portaldata.deleteMany({ user: userDoc!._id });
	} catch (e) {
		throw new Error('There was an error removing the old events from the database!');
	}

	for (const ev of events) {
		(ev as any).user = userDoc!._id;
	}

	const newEvents = events as PortalCacheEvent[];

	try {
		await portaldata.insertMany(newEvents);
	} catch (e) {
		throw new Error(`There was an error inserting events into the database! (${e})`);
	}

	try {
		await userdata.updateOne({ user }, { $set: { inPortalQueueCalendar: false } });
	} catch (e) {
		throw new Error('There was an error removing the user from the queue!');
	}

	return newEvents;
}

/**
 * Processes the queue for updating cached Portal data.
 * @param db Database connection.
 */
export async function processPortalQueue(db: Db) {
	const userdata = db.collection<UserDoc>('users');

	let queue: UserDoc[];
	try {
		queue = await userdata.find({ $or: [{ inPortalQueueClasses: true }, { inPortalQueueCalendar: true }] }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	for (const queueObj of queue) {
		if (queueObj.inPortalQueueClasses) { await addPortalQueueClasses(db, queueObj.user); }
		if (queueObj.inPortalQueueCalendar) { await addPortalQueueCalendar(db, queueObj.user); }
	}
}

/**
 * Checks the Canvas cache for a user. If there's no cache data, updates the cache.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the cache data.
 */
export async function canvasCacheRetry(db: Db, user: string) {
	const { hasURL, events } = await canvas.getFromCache(db, user);

	if (!hasURL || !events || events.length > 0) { return { hasURL, events }; }

	// If the events are empty, there's a chance that we just didn't cache results yet
	await updateCanvasCache(db, user);

	return canvas.getFromCache(db, user);
}
