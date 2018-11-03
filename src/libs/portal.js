'use strict';

/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */
const config = require(__dirname + '/config.js');

const _ = require('underscore');
const feeds = require(__dirname + '/feeds.js');
const ical = require('ical');
const moment = require('moment');
const querystring = require('querystring');
const request = require('request');
const url = require('url');
const users = require(__dirname + '/users.js');

// URL Calendars come from
const urlPrefix = 'https://api.veracross.com/micds/subscribe/';

// RegEx to test if calendar summary contains a valid Day Rotation
const validDayRotationPlain = /^US - Day [1-6]/;

const checkClassSummary = /.*:.?:[--9]*/;
const portalSummaryBlock = /:[A-G]:\d{2}$/g;
// Modified portal summary block to clean up everythiing for displaying
const cleanUpBlockSuffix = / [A-Za-z]+ \d{3}:[A-G]:\d{2}$/g;

// Range of Portal calendars in months
const portalRange = {
	previous: 2,
	upcoming: 12
};

/**
 * Makes sure a given url is valid and it points to *a* Portal calendar feed
 * @function verifyURLGeneric
 *
 * @param {string} portalURL - URI to iCal feed
 * @param {verifyURLGenericCallback} callback - Callback
 */

/**
 * Returns whether url is valid or not
 * @callback verifyURLGenericCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
 * @param {string} url - Valid and formatted URL to our likings. Null if error or invalid url.
 * @param {Object} body - Response body if valid url, null if error or invalid url.
 */

function verifyURLGeneric(portalURL, callback) {

	if(typeof callback !== 'function') return;

	if(typeof portalURL !== 'string') {
		callback(new Error('Invalid URL!'), null, null, null);
		return;
	}

	// Parse URL first
	const parsedURL = url.parse(portalURL);

	if (!parsedURL || !parsedURL.pathname) {
		callback(null, 'Cannot parse URL!', null, null);
		return;
	}

	if (!parsedURL.query) {
		callback(null, 'Missing query parameters! Make sure to paste the full url.', null, null);
		return;
	}

	const queries = querystring.parse(parsedURL.query);
	const pathID = parsedURL.pathname.split('/')[3];

	if(typeof pathID !== 'string' && typeof queries.uid !== 'string') {
		callback(null, 'URL does not contain calendar ID!', null, null);
		return;
	}

	const validURL = `${urlPrefix}${pathID}?uid=${queries.uid}`;

	// Not lets see if we can actually get any data from here
	request(validURL, (err, response, body) => {
		if(err) {
			callback(new Error('There was a problem fetching portal data from the URL!'), null, null, null);
			return;
		}
		if(response.statusCode !== 200) {
			callback(null, 'Invalid URL!', null, null);
			return;
		}

		// // Look through every 'Day # (US/MS)' andd see how many events there are
		// const dayDates = {};
		// for(const calEvent of Object.values(ical.parseICS(body))) {
		// 	// If event doesn't have a summary, skip
		// 	if(typeof calEvent.summary !== 'string') continue;
		//
		// 	// See if valid day
		// 	if(validDayRotation.test(calEvent.summary)) {
		// 		// Get actual day
		// 		const day = calEvent.summary.match(/[1-6]/)[0];
		// 		// Get date
		// 		const start = new Date(calEvent.start);
		//
		// 		// Add to dayDates object
		// 		if(typeof dayDates[day] === 'undefined') {
		// 			dayDates[day] = [];
		// 		}
		// 		dayDates[day].push({
		// 			year : start.getFullYear(),
		// 			month: start.getMonth() + 1,
		// 			day  : start.getDate()
		// 		});
		// 	}
		// }

		// if(_.isEmpty(dayDates)) {
		// 	callback(null, 'The calendar does not contain the information we need! Make sure you\'re copying your personal calendar!', null);
		// 	return;
		// }

		callback(null, true, validURL, body);

	});
}

/**
 * Makes sure a given url is valid and it points to the 'All Classes' personal Portal calendar feed
 * @function verifyURLClasses
 *
 * @param {string} portalURL - URI to iCal feed
 * @param {verifyURLCallback} callback - Callback
 */

/**
 * Returns whether a url is valid or not
 * @callback verifyURLCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean|string} isValid - True if valid URL, string describing problem if not valid. Null if error.
 * @param {string} url - Valid and formatted URL to our likings. Null if error or invalid url.
 */

function verifyURLClasses(portalURL, callback) {
	verifyURLGeneric(portalURL, (err, isValid, url, body) => {
		if (err || typeof isValid === 'string') {
			callback(err, isValid, url);
			return;
		}

		// // Additional checks to make sure it is the correct portal feed type
		// const events = Object.values(ical.parseICS(body));
		// let count = 0;
		// for (const calEvent of events) {
		// 	if (checkClassSummary.test(calEvent.summary)) {
		//		count++;
		//	}
		// }

		// if ((count / events.length) < 0.5) {
		//  callback(null, 'The calendar does not contain the information we need! Make sure you\'re copying your \'All Classes\' calendar!', null);
		//	return;
		// }

		callback(null, true, url);
	});
}

/**
 * Makes sure a given url is valid and it points to the 'My Calendar' personal Portal calendar feed
 * @function verifyURLCalendar
 *
 * @param {string} portalURL - URI to iCal feed
 * @param {verifyURLCallback} callback - Callback
 */

function verifyURLCalendar(portalURL, callback) {
	verifyURLGeneric(portalURL, (err, isValid, url, body) => {
		if (err || typeof isValid === 'string') {
			callback(err, isValid, url);
			return;
		}

		// Additional checks to make sure it is the correct portal feed type
		const events = Object.values(ical.parseICS(body));
		let count = 0;
		for (const calEvent of events) {
			if (checkClassSummary.test(calEvent.summary)) {
				count++;
			}
		}

		// Do exact opposite as classes feed
		if ((count / events.length) >= 0.5) {
			callback(null, 'The calendar does not contain the information we need! Make sure you\'re copying your \'My Calendar\' calendar!', null);
			return;
		}

		callback(null, true, url);
	});
}

/**
 * Sets a user's calendar URL if valid
 * @function setURLClasses
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

function setURLClasses(db, user, url, callback) {
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

		verifyURLClasses(url, (err, isValid, validURL) => {
			if(err) {
				callback(err, null, null);
				return;
			} else if(isValid !== true) {
				callback(null, isValid, null);
				return;
			}

			const userdata = db.collection('users');

			userdata.update({ _id: userDoc['_id'] }, { $set: { portalURLClasses: validURL }}, { upsert: true }, err => {
				if(err) {
					callback(new Error('There was a problem updating the URL to the database!'), null, null);
					return;
				}

				feeds.addPortalQueueClasses(db, user, err => {
					if(err) {
						callback(err, null, null);
						return;
					}

					callback(null, true, validURL);
				});
			});
		});
	});
}

/**
 * Sets a user's calendar URL if valid
 * @function setURLCalendar
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

function setURLCalendar(db, user, url, callback) {
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

		verifyURLCalendar(url, (err, isValid, validURL) => {
			if(err) {
				callback(err, null, null);
				return;
			} else if(isValid !== true) {
				callback(null, isValid, null);
				return;
			}

			const userdata = db.collection('users');

			userdata.update({ _id: userDoc['_id'] }, { $set: { portalURLCalendar: validURL }}, { upsert: true }, err => {
				if(err) {
					callback(new Error('There was a problem updating the URL to the database!'), null, null);
					return;
				}

				feeds.addPortalQueueCalendar(db, user, err => {
					if(err) {
						callback(err, null, null);
						return;
					}

					callback(null, true, validURL);
				});
			});
		});
	});
}

/**
 * Get Portal events from the cache
 * @function getFromCacheClasses
 *
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

function getFromCacheClasses(db, user, callback) {
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
		if(typeof userDoc['portalURLClasses'] !== 'string') {
			callback(null, false, null);
			return;
		}

		const portalDataClasses = db.collection('portalFeedsClasses');

		portalDataClasses.find({ user: userDoc._id }).toArray((err, events) => {
			if(err) {
				callback(new Error('There was an error retrieving Portal events!'), null, null);
				return;
			}

			callback(null, true, events);
		});
	});
}

/**
 * Get Portal events from the cache
 * @function getFromCacheCalendar
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {getFromCacheCallback} callback - Callback
 */

function getFromCacheCalendar(db, user, callback) {
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
		if(typeof userDoc['portalURLCalendar'] !== 'string') {
			callback(null, false, null);
			return;
		}

		const portalDataCalendar = db.collection('portalFeedsCalendar');

		portalDataCalendar.find({ user: userDoc._id }).toArray((err, events) => {
			if(err) {
				callback(new Error('There was an error retrieving Portal events!'), null, null);
				return;
			}

			callback(null, true, events);
		});
	});
}

/**
 * Retrieves the calendar feed of a specific user
 * @function getFromCalClasses
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

function getFromCalClasses(db, user, callback) {
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
		if(typeof userDoc['portalURLClasses'] !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc['portalURLClasses'], (err, response, body) => {
			if(err) {
				callback(new Error('There was a problem fetching the classes calendar feed!'), null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			callback(null, true, Object.values(ical.parseICS(body)).filter(e => typeof e.summary === 'string'));
		});
	});
}

/**
 * Retrieves the calendar feed of a specific user
 * @function getFromCalCalendar
 *
 * @param {db} db - Database connection
 * @param {string} user - Username
 * @param {getFromCalCallback} callback - Callback
 */

function getFromCalCalendar(db, user, callback) {
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
		if(typeof userDoc['portalURLCalendar'] !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc['portalURLCalendar'], (err, response, body) => {
			if(err) {
				callback(new Error('There was a problem fetching the day rotation!'), null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			callback(null, true, Object.values(ical.parseICS(body)).filter(e => typeof e.summary === 'string'));
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
			if(startTime === scheduleDate.getTime() && Number.isNaN(endTime)) {
				// See if valid day
				if(validDayRotationPlain.test(calEvent.summary)) {
					// Get actual day
					const day = parseInt(calEvent.summary.match(/Day ([1-6])/)[1]);
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

	getFromCacheClasses(db, user, (err, hasURL, events) => {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!hasURL) {
			callback(null, false, null);
			return;
		}

		parsePortalClasses(events, callback);
	});
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

function parsePortalClasses(events, callback) {
	if(typeof callback !== 'function') return;

	if(typeof events !== 'object') {
		callback(new Error('Invalid events array!'), null, null);
		return;
	}

	const classes = {};

	// Go through each event and add to classes object with a count of how many times they occur
	for(const calEvent of events) {
		const start = moment(calEvent['start']);
		const end = moment(calEvent['end']);

		const startDay = start.clone().startOf('day');
		const endDay = end.clone().startOf('day');

		// Check if it's an all-day event
		if(start.isSame(startDay) && end.isSame(endDay)) {
			continue;
		}

		const className = calEvent.summary.trim();

		if(className.length > 0 && typeof classes[className] !== 'undefined') {
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
module.exports.portalSummaryBlock = portalSummaryBlock;

// Constants
module.exports.portalRange = portalRange;

// Functions
module.exports.verifyURLClasses     = verifyURLClasses;
module.exports.verifyURLCalendar    = verifyURLCalendar;
module.exports.setURLClasses        = setURLClasses;
module.exports.setURLCalendar       = setURLCalendar;
module.exports.getFromCacheClasses  = getFromCacheClasses;
module.exports.getFromCacheCalendar = getFromCacheCalendar;
module.exports.getFromCalClasses    = getFromCalClasses;
module.exports.getFromCalCalendar   = getFromCalCalendar;
module.exports.getDayRotation       = getDayRotation;
module.exports.getDayRotations      = getDayRotations;
module.exports.getClasses           = getClasses;
module.exports.cleanUp              = cleanUp;
