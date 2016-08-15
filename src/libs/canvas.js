'use strict';

/**
 * @file Reads Canvas calendar and retrieves events to integrate in our planner
 * @module canvas
 */

var _           = require('underscore');
var htmlParser  = require(__dirname + '/htmlParser.js');
var ical        = require('ical');
var request     = require('request');
var url         = require('url');
var users       = require(__dirname + '/users.js');

// URL Calendars come from
var urlPrefix = 'https://micds.instructure.com/feeds/calendars/';
// RegEx to test if calendar summary is a valid Day Rotation
var validDayRotation = /^Day [1-6] \((US|MS)\)$/;
var validDayRotationPlain = /^Day [1-6]$/;

/**
 * Makes sure a given url is valid and it points to a Canvas calendar feed
 * @function verifyURL
 *
 * @param {string} canvasURL - URI to iCal feed
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

function verifyURL(canvasURL, callback) {

	if(typeof callback !== 'function') return;

	if(typeof canvasURL !== 'string') {
		callback(new Error('Invalid URL!'), null, null);
		return;
	}

	// Parse URL first
	var parsedURL = url.parse(canvasURL);

	// Check if pathname is valid
	if(!parsedURL.pathname.startsWith('/feeds/calendars/')) {
		// Not a valid URL!
		callback(null, 'Invalid URL path!', null);
		return;
	}

	var pathParts = parsedURL.path.split('/');
	var userCalendar = pathParts[pathParts.length - 1];

	var validURL = urlPrefix + userCalendar;

	// Not lets see if we can actually get any data from here
	request(validURL, function(err, response, body) {
		if(err) {
			callback(new Error('There was a problem fetching calendar data from the URL!'), null, null);
			return;
		}
		if(response.statusCode !== 200) {
			callback(null, 'Invalid URL!', null);
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
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}

		verifyURL(url, function(err, isValid, validURL) {
			if(err) {
				callback(err, null, null);
				return;
			} else if(isValid !== true) {
				callback(null, isValid, null);
				return;
			}

			var userdata = db.collection('users');

			userdata.update({ _id: userDoc['_id'] }, { $set: { canvasURL: validURL }}, { upsert: true }, function(err, result) {
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
 * Retrieves a user's calendar from a given month
 * @function getEvents
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to get schedule
 * @param {Object} date - Object containing date to retrieve schedule. Leaving fields empty will default to today
 * @param {Number} [date.year] - What year to get schedule (Optional. Defaults to current year.)
 * @param {Number} [date.month] - Month number to get schedule. (1-12) (Optional. Defaults to current month.)
 * @param {getEventsCallback} callback - Callback
 */

 /**
  * Returns a user's schedule for that day
  * @callback getEventsCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  * @param {Boolean} hasURL - Whether user has set a valid portal URL. Null if failure.
  * @param {Object} events - Array of all the events in the month. Null if failure.
  */

function getEvents(db, user, date, callback) {
	if(typeof callback !== 'function') return;
	if(typeof db !== 'object') { new Error('Invalid database connection!'); return; }

	// Default month and year to current date
	var current = new Date();

	if(typeof date.month !== 'number' || Number.isNaN(date.month) || date.month < 1 || 12 < date.month || date.month % 1 !== 0) {
		date.month = current.getMonth() + 1;
	}
	if(typeof date.year !== 'number' || Number.isNaN(date.month) || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}

		if(typeof userDoc.canvasURL !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc.canvasURL, function(err, response, body) {
			if(err) {
				callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			var data = ical.parseICS(body);

			// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
			// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
			if(_.isEmpty(data)) {
				callback(new Error('Invalid URL!'), null, null);
				return;
			}

			// Loop through all of the events in the calendar feed and push events within month to validEvents
			var validEvents = [];
			for(var eventUid in data) {
				var canvasEvent = data[eventUid];

				var className;

				getClassName(canvasEvent, function(err, name) {
					if(err) {
						className = null;
					} else {
						className = name;
					}
				});

				var start = new Date(canvasEvent.start);
				var end   = new Date(canvasEvent.end);

				var startMonth = start.getMonth() + 1;
				var startYear  = start.getFullYear();

				var endMonth = end.getMonth() + 1;
				var endYear  = end.getFullYear();

				// class will be null if error in getting class name.
				var insertEvent = {
					_id  : canvasEvent.uid,
					user : userDoc.user,
					class: className,
					title: canvasEvent.summary,
					start: start,
					end  : end,
					link : canvasEvent.url
				};

				if(typeof canvasEvent['ALT-DESC'] === 'object') {
					insertEvent.desc = canvasEvent['ALT-DESC'].val;
					insertEvent.descPlaintext = htmlParser.htmlToText(insertEvent.desc);
				} else {
					insertEvent.desc = '';
					insertEvent.descPlaintext = '';
				}

				if((startMonth === date.month && startYear === date.year) || (endMonth === date.month && endYear === date.year)) {
					// If event start or end is in month
					validEvents.push(insertEvent);
				} else if ((startMonth < date.month && startYear <= date.year) && (endMonth > date.month && endYear >= date.year)) {
					// If event spans before and after month
					validEvents.push(insertEvent);
				}
			}

			callback(null, true, validEvents);

		});
	});
}

/**
 * Just gets the class name from the given calendar event.
 * @param {Object} calEvent - Calendar event to extract class name from
 * @param {getClassNameCallback} callback - Callback
 */
/**
 * Callback after class name is extracted
 * @callback getClassNameCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {string} className - Class name if success, null if failure
 */
function getClassName(calEvent, callback) {
	try {
		var className = _.last(calEvent.summary.match(/\[(.*?)\]/g)).replace(/(\[|\])/g, "");
		callback(null, className);
	} catch(err) {
		callback(new Error("There was an error getting a class name!"), null);
	}
}

/**
 * Gets a user's classes from CANVAS, not the PORTAL.
 * @function getClasses
 *
 * @param {Object} db - Database object
 * @param {string} user - User to get classes from
 * @param {getCanvasClassesCallback} callback - Callback
 */
/**
 * Returns array of classes from canvas
 * @callback getCanvasClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} classes - Array of classes from canvas if success, null if failure
 */
function getClasses(db, user, callback) {
	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		if(typeof userDoc['canvasURL'] !== 'string') {
			callback(new Error('Invalid URL!'), null);
			return;
		}

		request(userDoc['canvasURL'], function(err, response, body) {
			if(err) {
				callback(new Error('There was a problem fetching portal data from the URL!'), null);
				return;
			}
			if(response.statusCode !== 200) {
				callback(new Error('Invalid URL!'), null);
				return;
			}

			var data = ical.parseICS(body);

			// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
			// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
			if(_.isEmpty(data)) {
				callback(new Error('Invalid URL!'), null);
				return;
			}

			var classes = [];

			var errFromClass;

			for(var eventUid in data) {
				var calEvent = data[eventUid];

				// get the last bit of bracketed text, which happens to be the class name inserted by canvas
				// then get rid of the brackets
				getClassName(calEvent, function(err, name) {
					if(err) {
						errFromClass = err;
					} else {
						var className = name;
					}
				});

				if(_.contains(classes, className)) continue;

				classes.push(className);
			}
			if(errFromClass) {
				callback(errFromClass, null);
			} else {
				callback(null, classes);
			}
		});
	});
}

module.exports.verifyURL  	= verifyURL;
module.exports.setURL     	= setURL;
module.exports.getEvents  	= getEvents;
module.exports.getClasses 	= getClasses;