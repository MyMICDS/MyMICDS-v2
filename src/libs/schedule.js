'use strict';

/**
 * @file Uses Portal schedule feed and Configured Classes to format the user's schedule
 * @module schedule
 */

 var _             = require('underscore');
 var aliases       = require(__dirname + '/aliases.js');
 var asyncLib      = require('async');
 var classes       = require(__dirname + '/classes.js');
 var moment        = require('moment');
 var prisma        = require('prisma');
 var blockSchedule = require(__dirname + '/blockSchedule.js');
 var users         = require(__dirname + '/users.js');

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
  * @param {Boolean} schedule.special - Whether or not this schedule is a special little snowflake.
  * @param {Object} schedule.classes - Array containing schedule and classes for that day. Empty array if nothing is going on that day.
  * @param {Object} schedule.allDay - Array containing all-day events or events spanning multiple days. Empty array if nothing is going on that day.
  */

function getSchedule(db, user, date, callback) {
	if(typeof callback !== 'function') return;
	if(typeof db !== 'object') { new Error('Invalid database connection!'); return; }

	var scheduleDate = moment(date).startOf('day');
	var scheduleNextDay = scheduleDate.clone().add(1, 'day');

	users.get(db, user || '', function(err, isUser, userDoc) {
		if(err) {
			callback(err, null, null);
			return;
		}

		/*
		 * How we determine user's schedule (powered by http://asciiflow.com/)
		 * TBT 9th grade Python unit flowcharts
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
		var lateStart = false;
		if(scheduleDate.day() !== 3) {
			// Not Wednesday, school starts at 8
			defaultStart = scheduleDate.clone().hour(8);
		} else {
			// Wednesday, school starts at 9
			defaultStart = scheduleDate.clone().hour(9);
			lateStart = true;
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
				color: defaultColor,
				textDark: prisma.shouldTextBeDark(defaultColor)
			},
			start: defaultStart,
			end: defaultEnd
		}];

		// We will need this for later in the cleanClass() function
		var aliasCache = {};

		if(!isUser) {
			// Fallback to default schedule if user is invalid
			portal.getDayRotation(scheduleDate, function(err, scheduleDay) {
				if(err) {
					callback(err, null, null);
					return;
				}

				var schedule = {
					day: scheduleDay,
					special: false,
					classes: defaultClasses,
					allDay: []
				}

				callback(null, false, schedule);
			});

		} else if(typeof userDoc['portalURL'] !== 'string') {
			asyncLib.parallel({
				day: function(asyncCallback) {
					portal.getDayRotation(scheduleDate, function(err, scheduleDay) {
						if(err) {
							asyncCallback(err, null);
						} else {
							asyncCallback(null, scheduleDay);
						}
					});
				},
				classes: function(asyncCallback) {
					classes.get(db, user, function(err, classes) {
						if(err) {
							asyncCallback(err, null);
						} else {
							asyncCallback(null, classes);
						}
					});
				}
			}, function(err, results) {
				if(err) {
					callback(err, null, null);
					return;
				}

				// Assign each class to it's block
				var blocks = {};
				for(var i = 0; i < results.classes.length; i++) {
					var block = results.classes[i];
					blocks[block.block] = block; // Very descriptive
				}

				var schedule = blockSchedule.get(scheduleDate, results.day, lateStart, users.gradYearToGrade(userDoc['gradYear']), blocks);

				callback(null, false, {
					day: results.day,
					special: false,
					classes: schedule,
					allDay: []
				});
			});

		} else {
			// Get Portal calendar feed
			portal.getCal(db, user, function(err, hasURL, data) {
				if(err) {
					callback(err, null, null);
				}

				var schedule = {
					day: null,
					special: false,
					classes: [],
					allDay : []
				};

				// Loop through all of the events in the calendar feed
				var eventIndexes = Object.keys(data);
				var aliasCache = {};
				var conflictIndexes = [];

				function loopClass(i) {

					// Check if we're finished looping through classes
					if(i >= eventIndexes.length) {
						doneClassLoop();
						return;
					}

					var calEvent = data[eventIndexes[i]];
					if(typeof calEvent.summary !== 'string') {
						loopClass(++i);
						return;
					}

					var start = moment(calEvent['start']);
					var end   = moment(calEvent['end']);

					// Make sure the event isn't all whacky
					if(end.isBefore(start)) {
						loopClass(++i);
						return;
					}

					// Check if it's an all-day event
					if(start.isSameOrBefore(scheduleDate) && end.isSameOrAfter(scheduleNextDay)) {
						// See if valid day
						if(validDayRotation.test(calEvent.summary)) {
							// Get actual day
							var day = calEvent.summary.match(/[1-6]/)[0];
							schedule.day = day;
							// console.log('day is roation ' + day)
							loopClass(++i);
							return;
						}

						// Check if special schedule
						var lowercaseSummary = calEvent.summary.toLowerCase();
						if(lowercaseSummary.includes('special') && lowercaseSummary.includes('schedule')) {
							// console.log('special schedule DETECTED')
							schedule.special = true;
							loopClass(++i);
							return;
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

						// Determine if there's an alias
						if(aliasCache[calEvent.summary]) {
							// console.log(calEvent.summary + ' already has lias')
							schedule.classes.push({
								class: aliasCache[calEvent.summary],
								start: start,
								end: end
							});
							loopClass(++i);
						} else {
							aliases.getClass(db, user, 'portal', calEvent.summary, function(err, hasAlias, classObject) {
								if(err) {
									callback(err, null, null);
									return;
								}

								// console.log('class object alias', classObject)

								if(hasAlias) {
									// console.log(calEvent.summary + ' has alias! from get alias')
									aliasCache[calEvent.summary] = classObject;
								} else {
									// console.log(calEvent.summary + ' doesnt have alias! from get alias')

									// Determine block
									var blockPart = _.last(calEvent.summary.match(portalSummaryBlock));
									var block = 'other';

									if(blockPart) {
										block = _.last(blockPart.match(/[A-G]/g)).toLowerCase();
									}

									// Determine color
									var color = prisma(calEvent.summary).hex;

									aliasCache[calEvent.summary] = {
										portal: true,
										raw: calEvent.summary,
										name: cleanUp(calEvent.summary),
										teacher: {
											prefix: '',
											firstName: '',
											lastName: ''
										},
										block: block,
										type: 'other',
										color: color,
										textDark: prisma.shouldTextBeDark(color)
									}
								}

								schedule.classes.push({
									class: aliasCache[calEvent.summary],
									start: start,
									end  : end
								});
								loopClass(++i);
							});
						}
					} else {
						loopClass(++i);
					}
				}
				loopClass(0);

				function doneClassLoop() {

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

					// console.log(schedule.classes)

					if(schedule.special) {
						// If special schedule, just use default portal schedule
						callback(null, true, schedule);
						return;
					}

					// Override blocks with classes being taken today
					var blocks = {};
					for(var i = 0; i < schedule.classes.length; i++) {
						var scheduleClass = schedule.classes[i].class;
						// console.log('go throug hclass', scheduleClass.type, scheduleClass.block)
						blocks[scheduleClass.block] = scheduleClass;
					}

					var blockClasses = blockSchedule.get(scheduleDate, schedule.day, lateStart, users.gradYearToGrade(userDoc['gradYear']), blocks);

					// If schedule is null for some reason, default back to portal schedule
					if(blockClasses !== null) {
						schedule.classes = blockClasses;
					}
					callback(null, true, schedule);
				}
			});
		}
	});
}

/**
 * Orders classes by time. Classes later in the array will override the classes in the earlier in the array. Combination of order and combine.
 * @function ordineSchedule
 *
 * @param {Object} classes - Array / object of classes to order
 * @param {Object} overrideClasses - Array / object of classes to override initial classes
 * @param {Boolean|string} includeAliases - Whether or not to link classes to possible Portal Alias.
 */

module.exports.get = getSchedule;
