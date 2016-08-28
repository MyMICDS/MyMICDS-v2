'use strict';

/**
 * @file Reads calendar feed to determine schedule / day and other important events
 * @module portal
 */

var config = require(__dirname + '/config.js');

var _             = require('underscore');
var aliases       = require(__dirname + '/aliases.js');
var ical          = require('ical');
var moment        = require('moment');
var prisma        = require('prisma');
var querystring   = require('querystring');
var request       = require('request');
var blockSchedule = require(__dirname + '/blockSchedule.js');
var url           = require('url');
var users         = require(__dirname + '/users.js');

// URL Calendars come from
var urlPrefix = 'https://micds.myschoolapp.com/podium/feed/iCal.aspx?q=';
// RegEx to test if calendar summary is a valid Day Rotation
var validDayRotation = /^Day [1-6] \((US|MS)\)$/;
var validDayRotationPlain = /^Day [1-6]$/;

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
	var parsedURL = url.parse(portalURL);
	var queries = querystring.parse(parsedURL.query);

	if(typeof queries.q !== 'string') {
		callback(null, 'URL does not contain calendar ID!', null);
		return;
	}

	var validURL = urlPrefix + queries.q;

	// Not lets see if we can actually get any data from here
	request(validURL, function(err, response, body) {
		if(err) {
			callback(new Error('There was a problem fetching portal data from the URL!'), null, null);
			return;
		}
		if(response.statusCode !== 200) {
			callback(null, 'Invalid URL!', null);
			return;
		}

		var data = ical.parseICS(body);

		// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
		// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
		if(_.isEmpty(data)) {
			callback(null, 'Invalid URL!', null);
			return;
		}

		// Look through every 'Day # (US/MS)' andd see how many events there are
		var dayDates = {};
		for(var eventUid in data) {
			var calEvent = data[eventUid];
			// If event doesn't have a summary, skip
			if(typeof calEvent.summary !== 'string') continue;

			// See if valid day
			if(validDayRotation.test(calEvent.summary)) {
				// Get actual day
				var day = calEvent.summary.match(/[1-6]/)[0];
				// Get date
				var start = new Date(calEvent.start);

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

			userdata.update({ _id: userDoc['_id'] }, { $set: { portalURL: validURL }}, { upsert: true }, function(err, result) {
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
 * Retrieves a user's schedule with a given date
 * @function getSchedule
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username to get schedule
 * @param {Object} date - Date object of day to get schedule
 * @param {getScheduleCallback} callback - Callback
 */

 /**
  * Returns a user's schedule for that day
  * @callback getScheduleCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  * @param {Boolean} hasURL - Whether user has set a valid portal URL. Null if failure.
  * @param {Object} schedule - Object containing everything going on that day. Null if failure.
  * @param {Object} schedule.day - Speicifies what day it is in the schedule rotation. Null if no day is found.
  * @param {Object} schedule.classes - Array containing schedule and classes for that day. Empty array if nothing is going on that day.
  * @param {Object} schedule.allDay - Array containing all-day events or events spanning multiple days. Empty array if nothing is going on that day.
  */

function getSchedule(db, user, date, callback) {
	if(typeof callback !== 'function') return;
	if(typeof db !== 'object') { new Error('Invalid database connection!'); return; }

	var scheduleDate = moment(date).startOf('day');
	var scheduleNextDay = scheduleDate.clone().add(1, 'day');

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null, null);
			return;
		}

		/*
		 * How we determine user's schedule (powered by http://asciiflow.com/):
		 *
		 * +------------------+   No       +------------------------+
		 * | Does user exist? +----------->+ Just have School from  |
		 * +--------+---------+            | 8:00 (or 9:00) to 3:15 |
		 *          |                      +------------------------+
		 *          |
		 *          | Yes
		 *          |
		 *          v
		 * +--------+---------+   No       +----------------------------------+
		 * | Does user have a +----------->+ Default to block schedule of     |
		 * | Portal URL?      |            | users's grade (with any aliases) |
		 * +--------+---------+            +----------------------------------+
		 *          |
		 *          |
		 *          | Yes
		 *          |
		 *          v
		 * +--------+-----------+   Yes    +-------------------------------+
		 * | Is there a special +--------->+ Use Portal schedule,          |
		 * | schedule?          |          | substituting with any aliases |
		 * +--------+-----------+          +-------------------------------+
		 *          |
		 *          |
		 *          | No
		 *          |
		 *          v
		 * +--------+-----------------+        +-------------------------------------+
		 * | Query Portal classes and |        | Use block schedule of user's grade, |
		 * | get each block with its  +------->+ use any classes with corresponding  |
		 * | corresponding class name |        | blocks, and fallback to Portal URL  |
		 * +--------------------------+        +-------------------------------------+
		 *
		 */

		 // Get default class in case everything else fails
		var defaultStart = null;
 		if(scheduleDate.day() !== 3) {
 			// Not Wednesday, school starts at 8
 			defaultStart = scheduleDate.clone().hour(8);
 		} else {
 			// Wednesday, school starts at 9
 			defaultStart = scheduleDate.clone().hour(9);
 		}
 		var defaultEnd = scheduleDate.clone().hour(15).minute(15);

 		var defaultColor = '#A5001E';

		var defaultClasses = [{
			class: {
				name: 'School',
				teacher: {
					prefix: 'Ms.',
					firstName: 'Lisa',
					lastName: 'Lyle'
				},
				block: 'other',
				type: 'other',
				color: color,
				textDark: prisma.shouldTextBeDark(color)
			},
			start: start,
			end: end
		}];

		if(!isUser) {
			// Fallback to default schedule if user is invalid
			getDayRotation(scheduleDate, function(err, scheduleDay) {
				if(err) {
					callback(err, null, null);
					return;
				}

				var schedule = {
					day: scheduleDay,
					classes: defaultClasses,
					allDay: []
				}

				callback(null, false, schedule);

			});

		} else if(typeof userDoc['portalURL'] !== 'string') {
			// Fallback to default block schedule for user's grade
			getDayRotation(scheduleDate, function(err, scheduleDay) {
				if(err) {
					callback(err, null, null);
					return;
				}


				var schedule = blockSchedule.get(scheduleDay, scheduleDate.day() === 3, userDoc['gradYear']);

				if(schedule) {

				} else {
					// Fallback to default classes
					var schedule = {
						day: scheduleDay,
						classes: defaultClasses,
						allDay: []
					}

					callback(null, false, schedule);

				}
			});

		} else {
			// Get Portal calendar feed

			request(userDoc['portalURL'], function(err, response, body) {
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

				var schedule = {
					day: null,
					classes: [],
					allDay : []
				};

				// Loop through all of the events in the calendar feed
	            var conflictIndexes = [];

				for(var eventUid in data) {
					var calEvent = data[eventUid];
					if(typeof calEvent.summary !== 'string') continue;

					var start = moment(calEvent['start']);
					var end   = moment(calEvent['end']);

					// Make sure the event isn't all whacky
					if(end.isBefore(start)) continue;

					// Check if it's an all-day event
					if(start.isSameOrBefore(scheduleDate) && end.isSameOrAfter(scheduleNextDay)) {
						// See if valid day
						if(validDayRotation.test(calEvent.summary)) {
							// Get actual day
							var day = calEvent.summary.match(/[1-6]/)[0];
							schedule.day = day;
							continue;
						}

						schedule.allDay.push(cleanUp(calEvent.summary));
					}

					// See if it's part of the schedule
					if(start.isAfter(scheduleDate) && end.isBefore(scheduleNextDay)) {

						// Move other (if any) events with conflicting times
						for(var classIndex in schedule.classes) {
							var scheduleClass = schedule.classes[classIndex];

							var blockStart = scheduleClass.start;
							var blockEnd   = scheduleClass.end;

							// Determine start/end times relative to the class we're currently trying to add
							var startRelation = null;
							if(start.isSame(blockStart)) {
								startRelation = 'same start';

							} else if(start.isSame(blockEnd)) {
								startRelation = 'same end';

							} else if(start.isBefore(blockStart)) {
								startRelation = 'before';

							} else if(start.isAfter(blockEnd)) {
								startRelation = 'after';

							} else if(start.isAfter(blockStart) && start.isBefore(blockEnd)) {
								startRelation = 'inside';
							}

							var endRelation = null;
							if(end.isSame(blockStart)) {
								startRelation = 'same start';

							} else if(end.isSame(blockEnd)) {
								startRelation = 'same end';

							} else if(end.isBefore(blockStart)) {
								startRelation = 'before';

							} else if(end.isAfter(blockEnd)) {
								startRelation = 'after';

							} else if(end.isAfter(blockStart) && end.isBefore(blockEnd)) {
								startRelation = 'inside';
							}

							// If new event is totally unrelated to the block, just ignore
							if(startRelation === 'same end' || startRelation === 'after') continue;
							if(endRelation === 'same start' || endRelation === 'before') continue;

							// If same times, delete
							if(startRelation === 'same start' && endRelation === 'same end') {
								// Only push to array if index isn't already in array
								if(!_.contains(conflictIndexes, classIndex)) {
									conflictIndexes.push(classIndex);
								}
							}

							// If new event completely engulfs the block, delete the block
							if(startRelation === 'before' && endRelation === 'after') {
								// Only push to array if index isn't already in array
								if(!_.contains(conflictIndexes, classIndex)) {
									conflictIndexes.push(classIndex);
								}
							}

							// If new event is inside block
							if(startRelation === 'inside' && endRelation == 'inside') {
								// Split event into two
								var newBlock = scheduleClass;
								var oldEnd   = scheduleClass.end;

								schedule.classes[classIndex].end = start;
								newBlock.start = end;

								schedule.classes.push(newBlock);
							}

							// If start is inside block but end is not
							if(startRelation === 'inside' && (endRelation === 'after' || endRelation === 'same end')) {
								schedule.classes[classIndex].end = start;
							}

							// If end is inside block but start is not
							if(endRelation === 'inside' && (startRelation === 'before' || startRelation === 'same start')) {
								schedule.classes[classIndex].start = end;
							}
						}

						schedule.classes.push({
							class: calEvent.summary,
							start: start,
							end  : end
						});
					}
				}

				// Delete all conflicting classes
				conflictIndexes.sort();
				var deleteOffset = 0;
				for(var i = 0; i < conflictIndexes.length; i++) {
					var index = conflictIndexes[i] - deleteOffset++;
					schedule.classes.splice(index, 1);
				}

				// Reorder schedule because of deleted classes
				schedule.classes.sort(function(a, b) {
					return a.start - b.start;
				});

				// Check if any schedules have an alias. Otherwise, clean up.
				function cleanClass(i) {

					if(i >= schedule.classes.length) {
						// Done looping through classes!
						callback(null, true, schedule);
						return;
					}

					var scheduleName = schedule.classes[i].class.trim();

					aliases.getClass(db, user, 'portal', scheduleName, function(err, hasAlias, classObject) {

						var scheduleClass = cleanUp(scheduleName);

						if(hasAlias) {
							scheduleClass = classObject;
						}

						schedule.classes[i].class = scheduleClass;

						cleanClass(++i);
					});
				}
				cleanClass(0);

			});
		}
	});
}

/**
 * Get schedule day rotation
 * @function getDayRotation
 *
 * @param {Object} date - Object containing date to retrieve schedule. Leaving fields empty will default to today
 * @param {Number} [date.year] - What year to get schedule (Optional. Defaults to current year.)
 * @param {Number} [date.month] - Month number to get schedule. (1-12) (Optional. Defaults to current month.)
 * @param {Number} [date.day] - Day of month to get schedule. (Optional. Defaults to current day.)
 *
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

	var current = new Date();
	// Default date to current values
	if(typeof date.year !== 'number' || date.year % 1 !== 0) {
		date.year = current.getFullYear();
	}
	if(typeof date.month !== 'number' || date.month % 1 !== 0) {
		date.month = current.getMonth();
	}
	if(typeof date.day !== 'number' || date.day % 1 !== 0) {
		date.day = current.getDate();
	}

	var scheduleDate = new Date(date.year, date.month - 1, date.day);
	var scheduleNextDay = new Date(scheduleDate.getTime() + 60 * 60 * 24 * 1000);

	request(urlPrefix + config.portal.dayRotation, function(err, response, body) {
		if(err || response.statusCode !== 200) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		var data = ical.parseICS(body);

		// School Portal does not give a 404 if calendar is invalid. Instead, it gives an empty calendar.
		// Unlike Canvas, the portal is guaranteed to contain some sort of data within a span of a year.
		if(_.isEmpty(data)) {
			callback(new Error('There was a problem fetching the day rotation!'), null);
			return;
		}

		for(var eventUid in data) {
			var calEvent = data[eventUid];
			if(typeof calEvent.summary !== 'string') continue;

			var start = new Date(calEvent['start']);
			var end   = new Date(calEvent['end']);

			var startTime = start.getTime();
			var endTime   = end.getTime();

			// Check if it's an all-day event
			if(startTime <= scheduleDate.getTime() && scheduleNextDay.getTime() <= endTime) {
				// See if valid day
				if(validDayRotationPlain.test(calEvent.summary)) {
					// Get actual day
					var day = calEvent.summary.match(/[1-6]/)[0];
					callback(null, day);
					return;
				}
			}
		}

		callback(null, null);

	});
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

	// Split string between hyphens and trim each part
	var parts = str.split('-').map(function(value) { return value.trim() });

	// Get rid of empty strings
	for(var i = 0; i < parts.length; i++) {
		if(parts[i] === '') {
			parts.splice(i, 1);
		}
	}

	// Sort array using very special algorithm I thought of in the shower.
	parts.sort(function(a, b) {
		// Get length of strings
		var aLength = a.length;
		var bLength = b.length;

		// Get count of alphabetic characters in strings
		var alphabetic = /[A-Z]/ig;
		var aAlphabeticMatches = a.match(alphabetic);
		var bAlphabeticMatches = b.match(alphabetic);

		// .match actually returns an array. If it isn't null, assign length.
		var aAlphabeticCount = 0;
		if(aAlphabeticMatches) {
			aAlphabeticCount = aAlphabeticMatches.length;
		}

		var bAlphabeticCount = 0;
		if(bAlphabeticMatches) {
			bAlphabeticCount = bAlphabeticMatches.length;
		}

		// Get ratio of alphabetic / total characters
		var aRatio = aAlphabeticCount / aLength;
		var bRatio = bAlphabeticCount / bLength;

		// Final score is length multiplied by ratio
		var aGoodBoyPoints = aLength * aRatio;
		var bGoodBoyPoints = bLength * bRatio;

		return bGoodBoyPoints - aGoodBoyPoints;
	});

	return parts[0] || '';
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
 * @param {Boolean} hasURL - Whether or not the user has a Portal URL set
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

	users.get(db, user, function(err, isUser, userDoc) {
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

		request(userDoc['portalURL'], function(err, response, body) {
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

			var classes = {};

			// Go through each event and add to classes object with a count of how many times they occur
			for(var eventUid in data) {
				var calEvent = data[eventUid];

				if(typeof calEvent.summary !== 'string') continue;

				var start = moment(calEvent['start']);
				var end   = moment(calEvent['end']);

				var startDay = start.clone().startOf('day');
				var endDay = end.clone().startOf('day');

				// Check if it's an all-day event
				if(start.isSame(startDay) && end.isSame(endDay)) {
					continue;
				}

				var className = calEvent.summary.trim();

				if(typeof classes[className] !== 'undefined') {
					classes[className]++;
				} else {
					classes[className] = 1;
				}
			}

			var uniqueClasses = Object.keys(classes);
			var filteredClasses = [];

			for(var i = 0; i < uniqueClasses.length; i++) {
				var uniqueClass = uniqueClasses[i];
				var occurences = classes[uniqueClass];

				// Remove all class names containing a certain keyword
				var classKeywordBlacklist = [
					'US'
				];

				if(occurences >= 10) {

					// Check if class contains any word blacklisted
					var containsBlacklistedWord = false;
					for(var j = 0; j < classKeywordBlacklist.length; j++) {
						if(uniqueClass.includes(classKeywordBlacklist[j])) {
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

		});
	});
}

module.exports.verifyURL      = verifyURL;
module.exports.setURL         = setURL;
module.exports.getSchedule    = getSchedule;
module.exports.getDayRotation = getDayRotation;
module.exports.getClasses	  = getClasses;
