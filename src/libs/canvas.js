'use strict';

/**
 * @file Reads Canvas calendar and retrieves events to integrate in our planner
 * @module canvas
 */

var _           = require('underscore');
var aliases     = require(__dirname + '/aliases.js')
var htmlParser  = require(__dirname + '/htmlParser.js');
var ical        = require('ical');
var prisma      = require('prisma');
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
			var eventKeys = Object.keys(data);
			var validEvents = [];

			function checkEvent(i) {
				var canvasEvent = data[eventKeys[i]];

				var parsedEvent = parseCanvasTitle(canvasEvent.summary);
				var canvasColor = prisma(parsedEvent.class.raw);

				// Check if alias for class first
				aliases.getClass(db, user, 'canvas', parsedEvent.class.raw, function(err, hasAlias, aliasClassObject) {
					if(err) {
						callback(err, null, null);
						return;
					}

					var canvasClass = {
						_id: null,
						user: user,
						name: parsedEvent.class.name,
						teacher: {
							_id: null,
							prefix: '',
							firstName: parsedEvent.class.teacher.firstName,
							lastName: parsedEvent.class.teacher.lastName
						},
						type: 'other',
						block: 'other',
						color: canvasColor.hex.toUpperCase()
					};

					// If there is an alias, use that!
					if(hasAlias) {
						canvasClass = aliasClassObject;
					}

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
						class: canvasClass,
						title: parsedEvent.assignment,
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

					if(i < eventKeys.length - 1) {
						// If there's still more events, call function again
						checkEvent(++i);
					} else {
						// All done! Call callback
						callback(null, true, validEvents);
					}

				});
			}
			checkEvent(0);

		});
	});
}

/**
 * Parses a Canvas assignment title into class name and teacher's name.
 * @param {string} title - Canvas assignment title
 * @returns {Object}
 */

function parseCanvasTitle(title) {
	var classTeacherRegex = /\[.+\]/g;
	var teacherRegex = /:[A-Z]{5}$/g
	var firstLastBrackets = /(^\[)|(\]$)/g;

	// Get what's in the square brackets, including square brackets
	var classTeacher = _.last(title.match(classTeacherRegex));
	var classTeacherNoBrackets = classTeacher.replace(firstLastBrackets, '');
	// Subtract the class/teacher from the Canvas title
	var assignmentName = title.replace(classTeacherRegex, '').trim();

	// Also check if there's a teacher, typically seperated by a colon
	var teacher = (_.last(classTeacherNoBrackets.match(teacherRegex)) || '').replace(/^:/g, '');
	var teacherFirstName = teacher[0] || '';
	var teacherLastName = (teacher[1] || '') + teacher.substring(2).toLowerCase();

	// Subtract teacher from classTeacher to get the class
	var className = classTeacher.replace(teacher, '').replace(/\[|\]/g, '').replace(/:$/g, '');

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
 * Iterates through all of the user's events and get their classes from Canvas
 * @function getClasses
 *
 * @param {Object} db - Database object
 * @param {string} user - Username
 * @param {getClassesCallback} callback - Callback
 */

/**
 * Returns array of classes from canvas
 * @callback getClassesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} hasURL - Whether or not user has a Canvas URL set. Null if error.
 * @param {Array} classes - Array of classes from canvas. Null if error or no Canvas URL set.
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

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null, null);
			return;
		}

		if(typeof userDoc['canvasURL'] !== 'string') {
			callback(null, false, null);
			return;
		}

		request(userDoc['canvasURL'], function(err, response, body) {
			if(err) {
				callback(new Error('There was a problem fetching canvas data from the URL!'), null, null);
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

			var classes = [];

			for(var eventUid in data) {
				var calEvent = data[eventUid];

				var parsedEvent = parseCanvasTitle(calEvent.summary);

				// If not already in classes array, push to array
				if(!_.contains(classes, parsedEvent.class.raw)) {
					classes.push(parsedEvent.class.raw);
				}
			}

			callback(null, true, classes);

		});
	});
}

module.exports.verifyURL  	= verifyURL;
module.exports.setURL     	= setURL;
module.exports.getEvents  	= getEvents;
module.exports.getClasses 	= getClasses;
