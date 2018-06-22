import { GetPortalDayRotationResponse } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import config from './config';
import * as feeds from './feeds';
import * as users from './users';

import * as ical from 'ical';
import moment from 'moment';
import * as querystring from 'querystring';
import request from 'request-promise-native';
import * as _ from 'underscore';
import * as url from 'url';

// URL Calendars come from
const urlPrefix = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?z=';
// RegEx to test if calendar summary is a valid Day Rotation
export const validDayRotation = /^Day [1-6] \((US|MS)\)$/;
const validDayRotationPlain = /^Day [1-6]$/;

export const portalSummaryBlock = / - [0-9]{1,2} \([A-G][0-9]\)$/g;
// Modified portal summary block to clean up everythiing for displaying
const cleanUpBlockSuffix = / -( )?([0-9]{1,2} \(.+\))?$/g;

// Range of Portal calendars in months
export const portalRange = {
	previous: 2,
	upcoming: 12
};

/**
 * Makes sure a given url is valid and it points to a Portal calendar feed
 * @function verifyURL
 *
 * @param {string} portalURL - URI to iCal feed
 * @param {verifyURLCallback} callback - Callback
 */

/**
 * Returns whether url is valid or not
 * @callback verifyURLCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
 * @param {string} url - Valid and formatted URL to our likings. Null if error or invalid url.
 */

export async function verifyURL(portalURL: string) {
	if (typeof portalURL !== 'string') { throw new Error('Invalid URL!'); }

	// Parse URL first
	const parsedURL = url.parse(portalURL);
	const queries = querystring.parse(parsedURL.query!);

	if (typeof queries.z !== 'string') { return { isValid: 'URL does not contain calendar ID!', url: null }; }

	const validURL = urlPrefix + queries.z;

	// Not lets see if we can actually get any data from here
	let response;
	try {
		response = await request(validURL, {
			resolveWithFullResponse: true,
			simple: false
		});
	} catch (e) {
		throw new Error('There was a problem fetching portal data from the URL!');
	}
	if (response.statusCode !== 200) { throw new Error('Invalid URL!'); }

	// Look through every 'Day # (US/MS)' andd see how many events there are
	const dayDates: { [day: string]: Array<{
		year: number,
		month: number,
		day: number
	}> } = {};
	for (const calEvent of Object.values<PortalCalendarEvent>(ical.parseICS(response.body))) {
		// If event doesn't have a summary, skip
		if (typeof calEvent.summary !== 'string') { continue; }

		// See if valid day
		if (validDayRotation.test(calEvent.summary)) {
			// Get actual day
			const day = (calEvent.summary.match(/[1-6]/) as RegExpMatchArray)[0];
			// Get date
			const start = new Date(calEvent.start);

			// Add to dayDates object
			if (typeof dayDates[day] === 'undefined') {
				dayDates[day] = [];
			}
			dayDates[day].push({
				year : start.getFullYear(),
				month: start.getMonth() + 1,
				day  : start.getDate()
			});
		}
	}

	// if(_.isEmpty(dayDates)) {
	// 	throw new Error(
	// 		'The calendar does not contain the information we need! Make sure you\'re copying your personal calendar!');
	// }

	return { isValid: true, url: validURL };
}

/**
 * Sets a user's calendar URL if valid
 * @function setUrl
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} url - Calendar url
 * @param {setUrlCallback} callback - Callback
 */

/**
 * Returns the valid url that was inserted into database
 * @callback setUrlCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
 * @param {string} validURL - Valid url that was inserted into database. Null if error or url invalid.
 */

export async function setURL(db: Db, user: string, calUrl: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const { isValid, url: validURL } = await verifyURL(calUrl);
	if (isValid !== true) { return { isValid, validURL: null }; }

	const userdata = db.collection('users');

	try {
		await userdata.updateOne({ _id: userDoc!._id }, { $set: { portalURL: validURL } }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem updating the URL to the database!');
	}

	await feeds.addPortalQueue(db, user);

	return { isValid: true, validURL };
}

/**
 * Get Portal events from the cache
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {getFromCacheCallback} callback - Callback
 */

/**
 * Returns array containing Portal events
 * @callback getFromCacheCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
 * @param {Array} events - Array of events if success, null if failure.
 */

export async function getFromCache(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.portalURL !== 'string') { return { hasURL: false, events: null }; }

	const portaldata = db.collection<PortalCacheEvent>('portalFeeds');

	let events: PortalCacheEvent[];
	try {
		events = await portaldata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new Error('There was an error retrieving Portal events!');
	}

	return { hasURL: true, events };
}

/**
 * Retrieves the calendar feed of a specific user
 * @function getFromCal
 *
 * @param {db} db - Database connection
 * @param {string} user - Username
 * @param {getFromCalCallback} callback - Callback
 */

/**
 * Returns the parsed iCal feed of the user
 * @callback getFromCalCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
 * @param {Object} cal - Parsed iCal feed. Null if error.
 */

export async function getFromCal(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.portalURL !== 'string') { return { hasURL: false, cal: null }; }

	let response;
	try {
		response = await request(userDoc!.portalURL!, {
			resolveWithFullResponse: true,
			simple: false
		});
	} catch (e) {
		throw new Error('There was a problem fetching the day rotation!');
	}

	if (response.statusCode !== 200) { throw new Error('Invalid URL!'); }

	return {
		hasURL: true,
		cal: Object.values<PortalCalendarEvent>(ical.parseICS(response.body)).filter(e => typeof e.summary === 'string')
	};
}

/**
 * Get schedule day rotation
 * @function getDayRotation
 *
 * @param {Object} date - Date object containing date to retrieve schedule. Leaving fields empty will default to today.
 * @param {getDayRotationCallback} callback - Callback
 */

/**
 * Returns an integer between 1 and 6 for what day it is
 * @callback getDayRotationCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {scheduleDay} day - Integer between 1 and 6. Null if error or no available day.
 */

export async function getDayRotation(date: Date) {
	const scheduleDate = new Date(date);
	const scheduleNextDay = new Date(scheduleDate.getTime() + 60 * 60 * 24 * 1000);

	let body;
	try {
		body = await request(urlPrefix + config.portal.dayRotation);
	} catch (e) {
		throw new Error('There was a problem fetching the day rotation!');
	}

	const data = ical.parseICS(body);

	// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
	// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
	if (_.isEmpty(data)) { throw new Error('There was a problem fetching the day rotation!'); }

	for (const calEvent of Object.values<any>(data)) {
		if (typeof calEvent.summary !== 'string') { continue; }

		const start = new Date(calEvent.start);
		const end = new Date(calEvent.end);

		const startTime = start.getTime();
		const endTime = end.getTime();

		// Check if it's an all-day event
		if (startTime <= scheduleDate.getTime() && scheduleNextDay.getTime() <= endTime) {
			// See if valid day
			if (validDayRotationPlain.test(calEvent.summary)) {
				// Get actual day
				const day = parseInt(calEvent.summary.match(/[1-6]/)[0], 10);
				return day;
			}
		}
	}

	return null;
}

/**
 * Get all of the schedule day rotations we can get
 * @function getDayRotations
 *
 * @param {getDayRotationCallback} callback - Callback
 */

/**
 * Returns an integer between 1 and 6 for what day it is
 * @callback getDayRotationsCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {scheduleDay} days - Object containing integers 1-6 organized by year, month, and date
 * 							   (Ex. January 3rd, 2017 would be `day.2017.1.3`)
 */

export async function getDayRotations() {
	const days: GetPortalDayRotationResponse['days'] = {};

	let body;
	try {
		body = await request(urlPrefix + config.portal.dayRotation);
	} catch (e) {
		throw new Error('There was a problem fetching the day rotation!');
	}

	const data = ical.parseICS(body);

	// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
	// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
	if (_.isEmpty(data)) { throw new Error('There was a problem fetching the day rotation!'); }

	for (const calEvent of Object.values<any>(data)) {
		if (typeof calEvent.summary !== 'string') { continue; }

		const start = new Date(calEvent.start);

		const year = start.getFullYear();
		const month = start.getMonth() + 1;
		const date = start.getDate();

		// See if valid day
		if (validDayRotationPlain.test(calEvent.summary)) {
			// Get actual day
			const day = parseInt(calEvent.summary.match(/[1-6]/)[0], 10);

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
 * Gets a user's classes from the PORTAL, not CANVAS.
 * @function getClasses
 *
 * @param {Object} db - Database object
 * @param {string} user - User to get classes from
 * @param {getPortalClassesCallback} callback - Callback
 */

/**
 * Returns array of classes from portal
 * @callback getPortalClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
 * @param {Array} classes - Array of classes from portal. Null if error.
 */

export async function getClasses(db: Db, user: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof user !== 'string') { throw new Error('Invalid username!'); }

	const { hasURL, events } = await getFromCache(db, user);
	if (!hasURL) { return { hasURL: false, classes: null }; }

	return { hasURL: true, classes: parsePortalClasses(events!) };
}

/**
 * Retrieves all the classes in an array of Portal events
 * @function parsePortalClasses
 *
 * @param {Array} events - Array of portal events
 * @param {parsePortalClassesCallback} callback - Callback
 */

/**
 * Returns array of classes from portal
 * @callback parsePortalClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
 * @param {Array} classes - Array of classes from portal. Null if error.
 */

function parsePortalClasses(events: PortalCacheEvent[]) {
	if (typeof events !== 'object') { throw new Error('Invalid events array!'); }

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

		const className = calEvent.summary.trim();

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
		const classKeywordBlacklist = [
			'US'
		];

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
 * Cleans up the silly event titles we get from the portal
 * @function cleanUp
 *
 * @param {string} str - Summary to clean up
 * @returns {string}
 */

export function cleanUp(str: string) {
	if (typeof str !== 'string') { return str; }
	return str.replace(cleanUpBlockSuffix, '');
}

export interface PortalCalendarEvent {
	type: 'VEVENT';
	params: string[]; // empty
	uid: string;
	start: Date;
	end: Date;
	dtstamp: string;
	summary: string;
	status: 'CONFIRMED';
	class: 'PUBLIC';
	priority: '3';
	categories: ['podium', 'events'];
}

export interface PortalCalendarWithUser extends PortalCalendarEvent {
	user: ObjectID;
}

export interface PortalCacheEvent extends PortalCalendarWithUser {
	_id: ObjectID;
}
