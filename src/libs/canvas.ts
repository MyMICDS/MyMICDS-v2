import { AliasType, Block, CanvasEvent, ClassType, DefaultCanvasClass } from '@mymicds/sdk';
import * as ical from 'ical';
import * as _ from 'lodash';
import { Db, ObjectID } from 'mongodb';
import * as prisma from 'prisma';
import * as querystring from 'querystring';
import request from 'request-promise-native';
import * as url from 'url';
import * as aliases from './aliases';
import * as checkedEvents from './checkedEvents';
import { MyMICDSClassWithIDs } from './classes';
import * as feeds from './feeds';
import * as htmlParser from './htmlParser';
import * as users from './users';

// URL Calendars come from
const urlPrefix = 'https://micds.instructure.com/feeds/calendars/';

/**
 * Checks the validity of a Canvas calendar URL.
 * @param canvasURL The URL to check.
 * @returns Whether the URL is valid and a newly formatted URL if it is.
 */
export async function verifyURL(canvasURL: string) {
	// Parse URL first
	const parsedURL = url.parse(canvasURL);

	// Check if pathname is valid
	if (!parsedURL.pathname || !parsedURL.pathname.startsWith('/feeds/calendars/')) {
		// Not a valid URL!
		return { isValid: 'Invalid URL path!', url: null };
	}

	const pathParts = parsedURL.path!.split('/');
	const userCalendar = pathParts[pathParts.length - 1];

	const validURL = urlPrefix + userCalendar;

	// Not lets see if we can actually get any data from here
	let response;
	try {
		response = await request(validURL, {
			resolveWithFullResponse: true,
			simple: false
		});
	} catch (e) {
		throw new Error('There was a problem fetching calendar data from the URL!');
	}

	if (response.statusCode !== 200) { return { isValid: 'Invalid URL!', url: null }; }

	return { isValid: true, url: validURL };
}

/**
 * Sets a user's Canvas URL, if valid.
 * @param db Database connection.
 * @param user Username.
 * @param calUrl Canvas calendar URL to check.
 * @returns Whether the URL is valid.
 */
export async function setURL(db: Db, user: string, calUrl: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	const { isValid, url: validURL } = await verifyURL(calUrl);
	if (isValid !== true) { return { isValid, validURL: null }; }

	const userdata = db.collection('users');

	try {
		await userdata.updateOne({ _id: userDoc!._id }, { $set: { canvasURL: validURL } }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem updating the URL to the database!');
	}

	await feeds.updateCanvasCache(db, user);

	return { isValid: true, validURL };
}

/**
 * Retrieves a user's Canvas events from their URL.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the calendar events.
 */
export async function getUserCal(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.canvasURL !== 'string') { return { hasURL: false, events: null }; }

	let response;
	try {
		response = await request(userDoc!.canvasURL!, {
			resolveWithFullResponse: true,
			simple: false
		});
	} catch (e) {
		throw new Error('There was a problem fetching canvas data from the URL!');
	}
	if (response.statusCode !== 200) { throw new Error('Invalid URL!'); }

	return { hasURL: true, events: Object.values(ical.parseICS(response.body)) };
}

/**
 * Parses a Canvas class title into the class name and teacher name.
 * @param title Class title to parse.
 * @returns Parsed class and teacher data.
 */
function parseCanvasTitle(title: string) {
	const classTeacherRegex = /\[[^\[]+]$/g;
	const teacherRegex = /:[A-Z]{5}$/g;
	const firstLastBrackets = /(^\[)|(]$)/g;

	// Get what's in the square brackets, including square brackets
	const classTeacher = _.last(Array.from(title.match(classTeacherRegex) || [])) || '';
	const classTeacherNoBrackets = classTeacher.replace(firstLastBrackets, '');
	// Subtract the class/teacher from the Canvas title
	const assignmentName = title.replace(classTeacherRegex, '').trim();

	// Also check if there's a teacher, typically separated by a colon
	const teacher = (_.last(classTeacherNoBrackets.match(teacherRegex) || []) || '').replace(/^:/g, '');
	const teacherFirstName = teacher[0] || '';
	const teacherLastName = (teacher[1] || '') + teacher.substring(2).toLowerCase();

	// Subtract teacher from classTeacher to get the class
	const className = classTeacher.replace(teacher, '').replace(/[\[\]]/g, '').replace(/:$/g, '');

	return {
		assignment: assignmentName,
		class: {
			raw: classTeacherNoBrackets,
			name: className,
			teacher: {
				raw: teacher,
				firstName: teacherFirstName,
				lastName: teacherLastName
			}
		}
	};
}

/**
 * Turns a Canvas calendar link into an assignment link.
 * @param calLink Calendar link.
 */
function calendarToEvent(calLink: string) {
	// Example calendar link:
	// https://micds.instructure.com/calendar?include_contexts=course_XXXXXXX&month=XX&year=XXXX#assignment_XXXXXXX
	// 'assignment' can also be 'calendar_event'
	const calObject = url.parse(calLink);

	const courseId = (querystring.parse(calObject.query!).include_contexts as string).replace('_', 's/');

	// Remove hash sign and switch to event URL format
	const eventString = calObject.hash!.slice(1);
	let eventId;
	if (eventString.includes('assignment')) {
		eventId = eventString.replace('assignment_', 'assignments/');
	} else if (eventString.includes('calendar_event')) {
		eventId = eventString.replace('calendar_event_', 'calendar_events/');
	}

	return 'https://micds.instructure.com/' + courseId + '/' + eventId;
}

/**
 * Gets all of a user's Canvas classes by iterating through their events.
 * @param db Database object.
 * @param user Username.
 * @returns Whether the user has a saved URL and the associated classes.
 */
export async function getClasses(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.canvasURL !== 'string') { return { hasURL: false, classes: null }; }

	function parseEvents(eventsToParse: CanvasCacheEvent[]) {
		const classes: string[] = [];

		for (const calEvent of eventsToParse) {
			// If event doesn't have a summary, skip
			if (typeof calEvent.summary !== 'string') { continue; }

			const parsedEvent = parseCanvasTitle(calEvent.summary);

			// If not already in classes array, push to array
			if (parsedEvent.class.raw.length > 0 && !classes.includes(parsedEvent.class.raw)) {
				classes.push(parsedEvent.class.raw);
			}
		}

		return { hasURL: true, classes };
	}

	const canvasdata = db.collection<CanvasCacheEvent>('canvasFeeds');

	let events;
	try {
		events = await canvasdata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new Error('There was an error retrieving Canvas events!');
	}

	// If cache is empty, update it
	if (events.length > 0) {
		return parseEvents(events);
	} else {
		await feeds.updateCanvasCache(db, user);

		let retryEvents;
		try {
			retryEvents = await canvasdata.find({ user: userDoc!._id }).toArray();
		} catch (e) {
			throw new Error('There was an error retrieving Canvas events!');
		}

		return parseEvents(retryEvents);
	}
}

/**
 * Gets a user's Canvas events from the database cache.
 * @param db Database connection.
 * @param user Username.
 * @returns Whether the user has a saved URL and the cache events.
 */
export async function getFromCache(db: Db, user: string) {
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) { throw new Error('User doesn\'t exist!'); }

	if (typeof userDoc!.canvasURL !== 'string') { return { hasURL: false, events: null }; }

	const canvasdata = db.collection<CanvasCacheEvent>('canvasFeeds');

	let events;
	try {
		events = await canvasdata.find({ user: userDoc!._id }).toArray();
	} catch (e) {
		throw new Error('There was an error retrieving Canvas events!');
	}

	// Get which events are checked
	const checkedEventsList = await checkedEvents.list(db, user);

	// Loop through all of the events in the calendar feed and push events within month to validEvents
	const validEvents: CanvasEvent[] = [];
	// Cache class aliases
	const classAliases: { [name: string]: DefaultCanvasClass | MyMICDSClassWithIDs } = {};

	// Function for getting class to insert according to canvas name
	async function getCanvasClass(parsedEvent: ReturnType<typeof parseCanvasTitle>) {
		const name = parsedEvent.class.raw;

		// Check if alias is already cached
		if (typeof classAliases[name] !== 'undefined') {
			return classAliases[name];
		}

		// Query aliases to see if possible class object exists
		const { hasAlias, classObject: aliasClass } = await aliases.getClass(db, user, AliasType.CANVAS, name);

		// Backup object if Canvas class doesn't have alias
		const defaultColor = '#34444F';
		const canvasClass: DefaultCanvasClass = {
			_id: null,
			canvas: true,
			user,
			name: parsedEvent.class.name,
			teacher: {
				_id: null,
				prefix: '',
				firstName: parsedEvent.class.teacher.firstName,
				lastName: parsedEvent.class.teacher.lastName
			},
			type: ClassType.OTHER,
			block: Block.OTHER,
			color: defaultColor,
			textDark: prisma.shouldTextBeDark(defaultColor)
		};

		if (hasAlias) {
			classAliases[name] = aliasClass as MyMICDSClassWithIDs;
		} else {
			classAliases[name] = canvasClass;
		}

		return classAliases[name];
	}

	for (const canvasEvent of events) {
		// Skip custom Canvas calendar events
		if (canvasEvent.uid!.includes('event-calendar-event')) { continue; }

		const parsedEvent = parseCanvasTitle(canvasEvent.summary!);

		// Check if alias for class first
		const canvasClass = await getCanvasClass(parsedEvent);
		const start = new Date(canvasEvent.start!);
		const end = new Date(canvasEvent.end!);

		// class will be null if error in getting class name.
		const insertEvent: any = {
			_id: canvasEvent.uid,
			canvas: true,
			user: userDoc!.user,
			class: canvasClass,
			title: parsedEvent.assignment,
			start,
			end,
			link: calendarToEvent(canvasEvent.url!) || '',
			checked: checkedEventsList.includes(canvasEvent.uid!),
			createdAt: canvasEvent.createdAt
		};

		if (typeof canvasEvent['ALT-DESC'] === 'object') {
			insertEvent.desc = (canvasEvent['ALT-DESC'] as ical.ParamList).val;
			insertEvent.descPlaintext = htmlParser.htmlToText(insertEvent.desc);
		} else {
			insertEvent.desc = '';
			insertEvent.descPlaintext = '';
		}

		validEvents.push(insertEvent as CanvasEvent);
	}

	return { hasURL: true, events: validEvents };
}

/**
 * Retrieves all unique Canvas assignments from all of our users' Canvas feeds.
 * @param db Database connection.
 * @returns An object mapping Canvas class IDs to arrays of Canvas assignment names.
 */
export async function getUniqueEvents(db: Db) {
	const canvasdata = db.collection<CanvasCacheEvent>('canvasFeeds');
	const docs = await canvasdata.aggregate([
		{
			$group: {
				_id: '$uid',
				summary: { $first: '$summary' },
				start: { $first: '$start' },
				end: { $first: '$end' }
			}
		}
	]).toArray();

	const assignments: { [className: string]: UniqueEvent[] } = {};

	for (const doc of docs) {
		const parsedEvent = parseCanvasTitle(doc.summary!);
		const className = parsedEvent.class.name;
		const assignment = {
			_id: doc._id as string,
			name: parsedEvent.assignment,
			className,
			raw: doc.summary!,
			start: new Date(doc.start!),
			end: new Date(doc.end!)
		};

		if (!assignments[className]) {
			assignments[className] = [];
		}

		assignments[className].push(assignment);
	}

	for (const className of Object.keys(assignments)) {
		assignments[className].sort((a, b) => b.end.valueOf() - a.end.valueOf());
	}

	return assignments;
}

export type CanvasCacheEvent = ical.CalendarComponent & { _id: string | ObjectID, user: ObjectID, createdAt: Date };

export interface UniqueEvent {
	_id: string;
	name: string;
	className: string;
	raw: string;
	start: Date;
	end: Date;
}
