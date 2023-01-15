import { Db, ObjectID } from 'mongodb';
import { GetPortalDayRotationResponse } from '@mymicds/sdk';
import { InputError, InternalError } from './errors';
import { URL } from 'url';
import * as _ from 'lodash';
import * as calServer from '../../test/calendars/server';
import * as feeds from './feeds';
import * as ical from 'ical';
import * as users from './users';
import axios, { AxiosResponse } from 'axios';
import config from './config';
import moment from 'moment';

// URL Calendars come from
const urlPrefix = 'https://api.veracross.com/micds/subscribe/';

const dayRotationURL = process.env.CI
	? `http://localhost:${calServer.port}/dayRotation.ics`
	: urlPrefix + config.portal.dayRotation;

// RegEx to test if calendar summary contains a valid Day Rotation
const validDayRotationPlain = /^US [A-H] Day/;

const checkClassSummary = /.*:.?:[--9]*/;
export const portalSummaryBlock = /:[A-H]:\d{2}$/g;
// Modified portal summary block to clean up everythiing for displaying
const cleanUpBlockSuffix = / [A-Za-z]+ \d{3}(WC)?:[A-G]:\d{2}$/g;

// Range of Portal calendars in months
export const portalRange = {
	previous: 2,
	upcoming: 12
};

async function withCalSummary<T>(date: Date, summaryTest: (summary: string) => T) {
	const scheduleDate = new Date(date);

	let res;
	try {
		res = await axios.get(dayRotationURL);
	} catch (e) {
		throw new InternalError('There was a problem fetching the day rotation!', e as Error);
	}

	const data = ical.parseICS(res.data);

	// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
	// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
	if (_.isEmpty(data)) {
		throw new Error('There was a problem fetching the day rotation!');
	}

	for (const calEvent of Object.values(data)) {
		if (typeof calEvent.summary !== 'string') {
			continue;
		}

		const start = new Date(calEvent.start!);
		const end = new Date(calEvent.end || '');

		const startTime = start.getTime();
		const endTime = end.getTime();

		// Check if it's an all-day event
		if (startTime === scheduleDate.getTime() && Number.isNaN(endTime)) {
			// See if valid day
			if (validDayRotationPlain.test(calEvent.summary)) {
				// Run function
				return summaryTest(calEvent.summary);
			}
		}
	}

	return null;
}

/**
 * Ensures that a URL points to a Portal calendar feed of some kind.
 * @param portalURL The iCal feed link to check.
 * @returns Whether the URL is valid, a formatted URL, and the response body.
 */
async function verifyURLGeneric(portalURL: string) {
	// Parse URL first
	let parsedURL: URL;
	try {
		parsedURL = new URL(portalURL);
	} catch (e) {
		throw new InputError('Cannot parse URL!');
	}

	const params = parsedURL.searchParams;
	if (Array.from(params).length === 0) {
		return { isValid: 'URL does not contain calendar ID!', url: null, body: null };
	}

	const pathID = parsedURL.pathname.split('/')[3];

	const uid = params.get('uid');

	// noinspection SuspiciousTypeOfGuard
	if (typeof pathID !== 'string' || typeof uid !== 'string') {
		throw new InputError('URL does not contain calendar ID!');
	}

	const validURL = `${urlPrefix}${pathID}?uid=${uid}`;

	// Now let's actually check if we can get any data from here
	let response: AxiosResponse;
	try {
		response = await axios.get(validURL);
	} catch (e) {
		throw new InternalError(
			'There was a problem fetching portal data from the URL!',
			e as Error
		);
	}
	if (response.status !== 200) {
		throw new InputError('Invalid URL!');
	}

	return { isValid: true, url: validURL, body: response.data };
}

/**
 * Ensures that the given URL points to an "All Classes" Portal calendar feed.
 * @param portalURL The iCal feed link to check.
 * @returns Whether the URL is valid and a formatted URL.
 */
export async function verifyURLClasses(portalURL: string) {
	const { isValid, url } = await verifyURLGeneric(portalURL);

	if (typeof isValid === 'string') {
		return { isValid, url: null };
	}

	// // Additional checks to make sure it is the correct portal feed type
	// const events = Object.values(ical.parseICS(body));
	// let count = 0;
	// for (const calEvent of events) {
	// 	if (checkClassSummary.test(calEvent.summary)) {
	// 		count++;
	// 	}
	// }
	//
	// if ((count / events.length) < 0.5) {
	// 	callback(null, 'The calendar does not contain the information we need!' +
	// 		'Make sure you\'re copying your \'All Classes\' calendar!', null);
	// 	return;
	// }

	return { isValid: true, url };
}

/**
 * Ensures that the given URL points to an "My Calendar" Portal calendar feed.
 * @param portalURL The iCal feed link to check.
 * @returns Whether the URL is valid and a formatted URL.
 */
export async function verifyURLCalendar(portalURL: string) {
	const { isValid, url, body } = await verifyURLGeneric(portalURL);

	if (typeof isValid === 'string') {
		return { isValid, url: null };
	}

	// Additional checks to make sure it is the correct portal feed type
	const events = Object.values(ical.parseICS(body));
	let count = 0;
	for (const calEvent of events) {
		if (checkClassSummary.test(calEvent.summary!)) {
			count++;
		}
	}

	// Do exact opposite as classes feed
	if (count / events.length >= 0.5) {
		return {
			isValid:
				'The calendar does not contain the information we need!' +
				"Make sure you're copying your 'My Calendar' calendar!",
			url: null
		};
	}

	return { isValid: true, url };
}

/**
 * Validates and sets a user's "All Classes" calendar URL.
 * @param db Database connection.
 * @param user Username.
 * @param calUrl Whether the URL is valid and a formatted URL.
 */
export async function setURLClasses(db: Db, user: string, calUrl: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const { isValid, url: validURL } = await verifyURLClasses(calUrl);
	if (!isValid) {
		return { isValid, validURL: null };
	}

	const userdata = db.collection('users');

	try {
		await userdata.updateOne(
			{ _id: userDoc!._id },
			{ $set: { portalURLClasses: validURL } },
			{ upsert: true }
		);
	} catch (e) {
		throw new InternalError(
			'There was a problem updating the URL to the database!',
			e as Error
		);
	}

	await feeds.addPortalQueueClasses(db, user);

	return { isValid: true, validURL };
}

/**
 * Validates and sets a user's "All Classes" calendar URL.
 * @param db Database connection.
 * @param user Username.
 * @param calUrl Whether the URL is valid and a formatted URL.
 */
export async function setURLCalendar(db: Db, user: string, calUrl: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const { isValid, url: validURL } = await verifyURLCalendar(calUrl);

	if (isValid !== true) {
		return { isValid, validURL: null };
	}

	const userdata = db.collection('users');

	try {
		await userdata.updateOne(
			{ _id: userDoc!._id },
			{ $set: { portalURLCalendar: validURL } },
			{ upsert: true }
		);
	} catch (e) {
		throw new InternalError(
			'There was a problem updating the URL to the database!',
			e as Error
		);
	}

	await feeds.addPortalQueueCalendar(db, user);

	return { isValid: true, validURL };
}

/**
 * Gets a user's "All Classes" Portal events from the database cache.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the cache events.
 */
export async function getFromCacheClasses(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	if (typeof userDoc!.portalURLClasses !== 'string') {
		return { hasURL: false, events: null };
	}

	const portaldata = db.collection<PortalCacheEvent>('portalFeedsClasses');

	let events: PortalCacheEvent[];
	try {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		events = await portaldata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new InternalError('There was an error retrieving Portal events!', e as Error);
	}

	return { hasURL: true, events };
}

/**
 * Gets a user's "My Calendar" Portal events from the database cache.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the cache events.
 */
export async function getFromCacheCalendar(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	if (typeof userDoc!.portalURLCalendar !== 'string') {
		return { hasURL: false, events: null };
	}

	const portaldata = db.collection<PortalCacheEvent>('portalFeedsCalendar');

	let events: PortalCacheEvent[];
	try {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		events = await portaldata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new InternalError('There was an error retrieving Portal events!', e as Error);
	}

	return { hasURL: true, events };
}

/**
 * Retrieves a user's "All Classes" Portal events from their URL.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the calendar events.
 */
export async function getFromCalClasses(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	if (typeof userDoc!.portalURLClasses !== 'string') {
		return { hasURL: false, cal: null };
	}

	let response: AxiosResponse;
	try {
		response = await axios.get(userDoc!.portalURLClasses);
	} catch (e) {
		throw new InternalError('There was a problem fetching the day rotation!', e as Error);
	}

	if (response.status !== 200) {
		throw new InputError('Invalid URL!');
	}

	return {
		hasURL: true,
		cal: Object.values(ical.parseICS(response.data)).filter(e => typeof e.summary === 'string')
	};
}

/**
 * Retrieves a user's "My Calendar" Portal events from their URL.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the calendar events.
 */
export async function getFromCalCalendar(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	if (typeof userDoc!.portalURLCalendar !== 'string') {
		return { hasURL: false, cal: null };
	}

	let response: AxiosResponse;
	try {
		response = await axios.get(userDoc!.portalURLCalendar);
	} catch (e) {
		throw new InternalError('There was a problem fetching the day rotation!', e as Error);
	}

	if (response.status !== 200) {
		throw new InputError('Invalid URL!');
	}

	return {
		hasURL: true,
		cal: Object.values(ical.parseICS(response.data)).filter(e => typeof e.summary === 'string')
	};
}

/**
 * Retrieves the day rotation for a given date.
 * @param date The date to get the rotation for, defaults to today.
 * @returns The day rotation (character A-H).
 */
export async function getDayRotation(date: Date) {
	return withCalSummary(date, summary => {
		return /([A-H]) Day/.exec(summary)![1];
	});
}

/**
 * Return whether date is a late start
 * @param Date the day to check
 * @returns boolean of whether it is a late start day
 */
export async function isLateStart(date: Date) {
	// [A - G] because there 7 late start schedules (WHY???)
	const lateStart = await withCalSummary(date, summary => {
		return (/[A-G]9 Day/.exec(summary) ?? []).length > 0;
	});

	return lateStart ?? false;
}

/**
 * Retrieve *all* of the day rotations.
 * @returns An object pairing dates to day rotations.
 */
export async function getDayRotations() {
	const days: GetPortalDayRotationResponse['days'] = {};

	let body;
	try {
		body = await axios.get(dayRotationURL);
	} catch (e) {
		throw new InternalError('There was a problem fetching the day rotation!', e as Error);
	}

	const data = ical.parseICS(body.data);

	// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
	// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
	if (_.isEmpty(data)) {
		throw new Error('There was a problem fetching the day rotation!');
	}

	for (const calEvent of Object.values(data)) {
		if (typeof calEvent.summary !== 'string') {
			continue;
		}

		const start = new Date(calEvent.start!);

		const year = start.getFullYear();
		const month = start.getMonth() + 1;
		const date = start.getDate();

		// See if valid day
		if (validDayRotationPlain.test(calEvent.summary)) {
			// Get actual day
			const day = /[A-H]/.exec(calEvent.summary)![0];
			if (typeof days[year] !== 'object') {
				days[year] = {};
			}

			if (typeof days[year][month] !== 'object') {
				days[year][month] = {};
			}

			days[year][month][date] = day;
		}
	}

	return days;
}

/**
 * Gets all of a user's Portal classes.
 * @param db Database connection.
 * @param user Username.
 * @returns A list of Portal class names.
 */
export async function getClasses(db: Db, user: string) {
	const { hasURL, events } = await getFromCacheClasses(db, user);
	if (!hasURL) {
		return { hasURL: false, classes: null };
	}

	// If cache is empty, update it
	if (events!.length > 0) {
		return { hasURL: true, classes: parsePortalClasses(events!) };
	}
	await feeds.addPortalQueueClasses(db, user);

	const { events: retryEvents } = await getFromCacheClasses(db, user);

	return { hasURL: true, classes: parsePortalClasses(retryEvents!) };
}

/**
 * Retrieves all the distinct classes from a list of Portal events.
 * @param events The Portal events to iterate through.
 * @returns A list of Portal class names.
 */
function parsePortalClasses(events: PortalCacheEvent[]) {
	if (typeof events !== 'object') {
		throw new InputError('Invalid events array!');
	}

	const classes: { [name: string]: number } = {};

	// Go through each event and add to classes object with a count of how many times they occur
	for (const calEvent of events) {
		const start = moment(calEvent.start);
		const end = moment(calEvent.end);

		const startDay = start.clone().startOf('day');
		const endDay = end.clone().startOf('day');

		// Check if it's an all-day event
		if (start.isSame(startDay) && end.isSame(endDay)) {
			continue;
		}

		const className = calEvent.summary!.trim();

		if (className.length > 0 && typeof classes[className] !== 'undefined') {
			classes[className]++;
		} else {
			classes[className] = 1;
		}
	}

	const uniqueClasses = Object.keys(classes);
	const filteredClasses: string[] = [];

	for (const uniqueClass of uniqueClasses) {
		const occurrences = classes[uniqueClass];

		// Remove all class names containing a certain keyword
		const classKeywordBlacklist = ['US'];

		if (occurrences >= 10) {
			// Check if class contains any word blacklisted
			let containsBlacklistedWord = false;
			for (const keyword of classKeywordBlacklist) {
				if (uniqueClass.includes(keyword)) {
					containsBlacklistedWord = true;
					break;
				}
			}

			// If doesn't contain keyword, push to array
			if (!containsBlacklistedWord) {
				filteredClasses.push(uniqueClass);
			}
		}
	}

	return filteredClasses;
}

/**
 * Cleans up the Portal event titles.
 * @param str The event summary to clean up.
 * @returns A more-readable event title.
 */
export function cleanUp(str: string) {
	// "Social Science" is two words and the regex will leave "Social"
	// by combining it, we can handle it properly
	return str.replace('Social Science', 'SocialScience').replace(cleanUpBlockSuffix, '');
}

export type PortalCacheEvent = ical.CalendarComponent & { _id: ObjectID; user: ObjectID };
