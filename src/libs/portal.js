'use strict';

/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */
const config = require(__dirname + '/config.js');

const _ = require('underscore');
const ical = require('ical');
const moment = require('moment');
const querystring = require('querystring');
const request = require('request');
const url = require('url');
const users = require(__dirname + '/users.js');

// URL Calendars come from
const urlPrefix = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?z=';
// RegEx to test if calendar summary is a valid Day Rotation
const validDayRotation = /^Day [1-6] \((US|MS)\)$/;
const validDayRotationPlain = /^Day [1-6]$/;

const portalSummaryBlock = / - [0-9]{1,2} \([A-G][0-9]\)$/g;
// Modified portal summary block to clean up everythiing for displaying
const cleanUpBlockSuffix = / -( )?([0-9]{1,2} \(.+\))?$/g;

// Range of Portal calendars in months
const portalRange = {
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

function verifyURL(portalURL, callback) {

	if(typeof callback !== 'function') return;

	if(typeof portalURL !== 'string') {
		callback(new Error('Invalid URL!'), null, null);
		return;
	}

	// Parse URL first
	const parsedURL = url.parse(portalURL);
	const queries = querystring.parse(parsedURL.query);

	if(typeof queries.z !== 'string') {
		callback(null, 'URL does not contain calendar ID!', null);
		return;
	}

	const validURL = urlPrefix + queries.z;

	// Not lets see if we can actually get any data from here
	request(validURL, (err, response, body) => {
		if(err) {
			callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
			return;
		}
		if(response.statusCode !== 200) {
			callback(null, 'Invalid URL!', null);
			return;
		}

		const data = ical.parseICS(body);

		// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
		// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
		if(_.isEmpty(data)) {
			callback(null, 'Invalid URL!', null);
			return;
		}

		// Look through every 'Day # (US/MS)' andd see how many events there are
		const dayDates = {};
		for(const calEvent of Object.values(data)) {
			// If event doesn't have a summary, skip
			if(typeof calEvent.summary !== 'string') continue;

			// See if valid day
			if(validDayRotation.test(calEvent.summary)) {
				// Get actual day
				const day = calEvent.summary.match(/[1-6]/)[0];
				// Get date
				const start = new Date(calEvent.start);

				// Add to dayDates object
				if(typeof dayDates[day] === 'undefined') {
					dayDates[day] = [];
				}
				dayDates[day].push({
					year : start.getFullYear(),
					month: start.getMonth() + 1,
					day  : start.getDate()
				});
			}
		}

		if(_.isEmpty(dayDates)) {
			callback(null, 'The calendar does not contain the information we need! Make sure you\'re copying your personal calendar!', null);
			return;
		}

		callback(null, true, validURL);

	});
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

function setURL(db, user, url, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}

		verifyURL(url, (err, isValid, validURL) => {
			if(err) {
				callback(err, null, null);
				return;
			} else if(isValid !== true) {
				callback(null, isValid, null);
				return;
			}

			const userdata = db.collection('users');

			userdata.update({ _id: userDoc['_id'] }, { $set: { portalURL: validURL }}, { upsert: true }, err => {
				if(err) {
					callback(new Error('There was a problem updating the URL to the database!'), null, null);
					return;
				}

				callback(null, true, validURL);

			});
		});
	});
}

/**
 * Retrieves the calendar feed of a specific user
 * @function getCal
 *
 * @param {db} db - Database connection
 * @param {string} user - Username
 * @param {getCalCallback} callback - Callback
 */

/**
 * Returns the parsed iCal feed of the user
 * @callback getCalCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
 * @param {Object} cal - Parsed iCal feed. Null if error.
 */

function getCal(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}
		if(typeof userDoc['portalURL'] !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc['portalURL'], (err, response, body) => {
			if(err) {
				callback(new Error('There was a problem fetching the day rotation!'), null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			const data = ical.parseICS(body);

			// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
			// Unlike Canvas, the Portal is guaranteed to contain some sort of data within a span of a year.
			if(_.isEmpty(data)) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			callback(null, true, data);
		});
	});
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

function getDayRotation(date, callback) {
	if(typeof callback !== 'function') return;

	const scheduleDate = new Date(date);
	const scheduleNextDay = new Date(scheduleDate.getTime() + 60 * 60 * 24 * 1000);

	request(urlPrefix + config.portal.dayRotation, (err, response, body) => {
		if(err || response.statusCode !== 200) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		const data = ical.parseICS(body);

		// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
		// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
		if(_.isEmpty(data)) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		for(const calEvent of Object.values(data)) {
			if(typeof calEvent.summary !== 'string') continue;

			const start = new Date(calEvent['start']);
			const end = new Date(calEvent['end']);

			const startTime = start.getTime();
			const endTime = end.getTime();

			// Check if it's an all-day event
			if(startTime <= scheduleDate.getTime() && scheduleNextDay.getTime() <= endTime) {
				// See if valid day
				if(validDayRotationPlain.test(calEvent.summary)) {
					// Get actual day
					const day = parseInt(calEvent.summary.match(/[1-6]/)[0]);
					callback(null, day);
					return;
				}
			}
		}

		callback(null, null);

	});
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
  * @param {scheduleDay} days - Object containing integers 1-6 organized by year, month, and date (Ex. January 3rd, 2017 would be `day.2017.1.3`)
  */

function getDayRotations(callback) {
	if(typeof callback !== 'function') return;

	const days = {};

	request(urlPrefix + config.portal.dayRotation, (err, response, body) => {
		if(err || response.statusCode !== 200) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		const data = ical.parseICS(body);

		// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
		// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
		if(_.isEmpty(data)) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		for(const calEvent of Object.values(data)) {
			if(typeof calEvent.summary !== 'string') continue;

			const start = new Date(calEvent['start']);

			const year = start.getFullYear();
			const month = start.getMonth() + 1;
			const date = start.getDate();

			// See if valid day
			if(validDayRotationPlain.test(calEvent.summary)) {
				// Get actual day
				const day = parseInt(calEvent.summary.match(/[1-6]/)[0]);

				if (typeof days[year] !== 'object') {
					days[year] = {};
				}

				if (typeof days[year][month] !== 'object') {
					days[year][month] = {};
				}

				days[year][month][date] = day;
			}
		}

		callback(null, days);

	});
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

function getClasses(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}

		if(typeof userDoc['portalURL'] !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc['portalURL'], (err, response, body) => {
			if(err) {
				callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			const data = ical.parseICS(body);

			// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
			// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
			if(_.isEmpty(data)) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			parseIcalClasses(data, callback);

		});
	});
}

/**
 * Retrieves all the classes in a parsed iCal object
 * @function parseIcalClasses
 *
 * @param {Object} data - Parsed iCal object
 * @param {parseIcalClassesCallback} callback - Callback
 */

 /**
  * Returns array of classes from portal
  * @callback parseIcalClassesCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  * @param {Boolean} hasURL - Whether or not the user has a Portal URL set. Null if error.
  * @param {Array} classes - Array of classes from portal. Null if error.
  */

function parseIcalClasses(data, callback) {
	if(typeof callback !== 'function') return;

	if(typeof data !== 'object') {
		callback(new Error('Invalid iCal object!'), null, null);
		return;
	}

	const classes = {};

	// Go through each event and add to classes object with a count of how many times they occur
	for(const calEvent of Object.values(data)) {
		if(typeof calEvent.summary !== 'string') continue;

		const start = moment(calEvent['start']);
		const end = moment(calEvent['end']);

		const startDay = start.clone().startOf('day');
		const endDay = end.clone().startOf('day');

		// Check if it's an all-day event
		if(start.isSame(startDay) && end.isSame(endDay)) {
			continue;
		}

		const className = calEvent.summary.trim();

		if(typeof classes[className] !== 'undefined') {
			classes[className]++;
		} else {
			classes[className] = 1;
		}
	}

	const uniqueClasses = Object.keys(classes);
	const filteredClasses = [];

	for(const uniqueClass of uniqueClasses) {
		const occurrences = classes[uniqueClass];

		// Remove all class names containing a certain keyword
		const classKeywordBlacklist = [
			'US'
		];

		if(occurrences >= 10) {

			// Check if class contains any word blacklisted
			let containsBlacklistedWord = false;
			for(const keyword of classKeywordBlacklist) {
				if(_.contains(uniqueClass, keyword)) {
					containsBlacklistedWord = true;
					break;
				}
			}

			// If doesn't contain keyword, push to array
			if(!containsBlacklistedWord) {
				filteredClasses.push(uniqueClass);
			}
		}
	}

	callback(null, true, filteredClasses);
}

/**
 * Cleans up the silly event titles we get from the portal
 * @function cleanUp
 *
 * @param {string} str - Summary to clean up
 * @returns {string}
 */

function cleanUp(str) {
	if(typeof str !== 'string') return str;
	return str.replace(cleanUpBlockSuffix, '');
}

// RegEx
module.exports.validDayRotation   = validDayRotation;
module.exports.portalSummaryBlock = portalSummaryBlock;

// Constants
module.exports.portalRange = portalRange;

// Functions
module.exports.verifyURL       = verifyURL;
module.exports.setURL          = setURL;
module.exports.getCal          = getCal;
module.exports.getDayRotation  = getDayRotation;
module.exports.getDayRotations = getDayRotations;
module.exports.getClasses      = getClasses;
module.exports.cleanUp         = cleanUp;
