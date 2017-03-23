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
var users         = require(__dirname + '/users.js');
var prisma        = require('prisma');
var portal        = require(__dirname + '/portal.js');
var blockSchedule = require(__dirname + '/blockSchedule.js');
var users         = require(__dirname + '/users.js');

// Mappings for default blocks
var genericBlocks = {
	activities: {
		name: 'Activities',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#FF6347',
		textDark: prisma.shouldTextBeDark('#FF6347')
	},
	advisory: {
		name: 'Advisory',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#5a98ec',
		textDark: prisma.shouldTextBeDark('#5a98ec')
	},
	collaborative: {
		name: 'Collaborative Work',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#29ABE2',
		textDark: prisma.shouldTextBeDark('#29ABE2')
	},
	community: {
		name: 'Community',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#AA0031',
		textDark: prisma.shouldTextBeDark('#AA0031')
	},
	enrichment: {
		name: 'Enrichment',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#FF4500',
		textDark: prisma.shouldTextBeDark('#FF4500')
	},
	flex: {
		name: 'Flex',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#CC33FF',
		textDark: prisma.shouldTextBeDark('#CC33FF')
	},
	lunch: {
		name: 'Lunch!',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#116C53',
		textDark: prisma.shouldTextBeDark('#116C53')
	},
	recess: {
		name: 'Recess',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#FFFF00',
		textDark: prisma.shouldTextBeDark('#FFFF00')
	},
	pe: {
		name: 'Physical Education',
		teacher: {
			prefix: '',
			firstName: '',
			lastName: ''
		},
		type: 'other',
		block: 'other',
		color: '#91E11D',
		textDark: prisma.shouldTextBeDark('#91E11D')
	}
};

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

	users.get(db, user || '', (err, isUser, userDoc) => {
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

		// Determine when school should start and end for a default schedule
		var lateStart = false;
		var defaultStart = null;
		if(scheduleDate.day() !== 3) {
			// Not Wednesday, school starts at 8
			defaultStart = scheduleDate.clone().hour(8);
		} else {
			// Wednesday, school starts at 9
			defaultStart = scheduleDate.clone().hour(9);
			lateStart = true;
		}
		var defaultEnd = scheduleDate.clone().hour(15).minute(15);

		// Default color for class
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

		// If it isn't a user OR it's a teacher with no Portal URL
		if(!isUser || (userDoc['gradYear'] === null && typeof userDoc['portalURL'] !== 'string')) {
			// Fallback to default schedule if user is invalid
			portal.getDayRotation(scheduleDate, (err, scheduleDay) => {
				if(err) {
					callback(err, null, null);
					return;
				}

				var schedule = {
					day: scheduleDay,
					special: false,
					classes: [],
					allDay: []
				};

				if(scheduleDay) {
					schedule.classes = defaultClasses;
				}

				callback(null, false, schedule);
			});

		} else if(typeof userDoc['portalURL'] !== 'string') {
			// If user is logged in, but hasn't configured their Portal URL
			// We would know their grade, and therefore their generic block schedule, as well as any classes they configured
			asyncLib.parallel({
				day: asyncCallback => {
					portal.getDayRotation(scheduleDate, (err, scheduleDay) => {
						if(err) {
							asyncCallback(err, null);
						} else {
							asyncCallback(null, scheduleDay);
						}
					});
				},
				classes: asyncCallback => {
					classes.get(db, user, (err, classes) => {
						if(err) {
							asyncCallback(err, null);
						} else {
							asyncCallback(null, classes);
						}
					});
				}
			}, (err, results) => {
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

				// Include generic blocks in with the supplied blocks
				_.each(genericBlocks, (value, key) => {
					if(typeof blocks[key] !== 'object') {
						blocks[key] = value;
					}
				});

				var schedule = {
					day: results.day,
					special: false,
					classes: [],
					allDay: []
				};

				// Look up Block Schedule for user
				var daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc['gradYear']), results.day, lateStart);

				// Only combine with block schedule if the block schedule exists
				if(!daySchedule) {
					callback(null, false, schedule);
					return;
				}

				// Insert any possible classes the user as configured in Settings
				schedule.classes = combineClassesSchedule(scheduleDate, daySchedule, blocks);
				callback(null, false, schedule);
			});

		} else {
			// The user is logged in and has configured their Portal URL
			// We can therefore overlay their Portal classes ontop of their default block schedule for 100% coverage.
			asyncLib.parallel({
				// Get Portal calendar feed
				portal: asyncCallback => {
					portal.getCal(db, user, (err, hasURL, cal) => {
						if(err) {
							asyncCallback(err, null);
						} else {
							asyncCallback(null, {
								hasURL: hasURL,
								cal: cal
							});
						}
					});
				},
				// Get Portal aliases and their class objects
				aliases: asyncCallback => {
					aliases.mapList(db, user, asyncCallback);
				},
			}, (err, results) => {
				if(err) {
					callback(err, null, null);
					return;
				}

				var portalSchedule = [];
				var schedule = {
					day: null,
					special: false,
					classes: [],
					allDay : []
				};

				// Keep track of which classes we need to delete
				var conflictIndexes = [];

				// Go through all the events in the Portal calendar
				var eventIndexes = Object.keys(results.portal.cal);
				for(var i = 0; i < eventIndexes.length; i++) {
					var calEvent = results.portal.cal[eventIndexes[i]];
					if(typeof calEvent.summary !== 'string') continue;

					var start = moment(calEvent['start']);
					var end   = moment(calEvent['end']);

					// Make sure the event isn't all whacky
					if(end.isBefore(start)) continue;

					// Check if it's an all-day event
					if(start.isSameOrBefore(scheduleDate) && end.isSameOrAfter(scheduleNextDay)) {
						// See if valid day
						if(portal.validDayRotation.test(calEvent.summary)) {
							// Get actual day
							var day = parseInt(calEvent.summary.match(/[1-6]/)[0]);
							schedule.day = day;
							continue;
						}

						// Check if special schedule
						var lowercaseSummary = calEvent.summary.toLowerCase();
						if(lowercaseSummary.includes('special') && lowercaseSummary.includes('schedule')) {
							schedule.special = true;
							continue;
						}

						// Push event to all-day events
						schedule.allDay.push(portal.cleanUp(calEvent.summary));

					} else if(start.isAfter(scheduleDate) && end.isBefore(scheduleNextDay)) {
						// See if it's part of the schedule

						// We should use the Portal class's alias; otherwise, we should fallback to a default class object. [sp1a]
						if(typeof results.aliases.portal[calEvent.summary] !== 'object') {

							// Determine block
							var blockPart = _.last(calEvent.summary.match(portal.portalSummaryBlock));
							var block = 'other';

							if(blockPart) {
								block = _.last(blockPart.match(/[A-G]/g)).toLowerCase();
							}

							// Generate random color
							var color = prisma(calEvent.summary).hex;

							// RegEx for determining block and stuff is a bit intense; therefore, we should cache it. [sp1a]
							results.aliases.portal[calEvent.summary] = {
								portal: true,
								name: portal.cleanUp(calEvent.summary),
								teacher: {
									prefix: '',
									firstName: '',
									lastName: ''
								},
								block: block,
								type: 'other',
								color: color,
								textDark: prisma.shouldTextBeDark(color)
							};
						}

						// Add block into Portal Schedule array
						portalSchedule.push({
							class: results.aliases.portal[calEvent.summary],
							start: start,
							end: end
						})
					}
				}

				portalSchedule = ordineSchedule([], portalSchedule);

				// If special schedule, just use default portal schedule
				if(schedule.special) {
					schedule.classes = portalSchedule;
					callback(null, true, schedule);
					return;
				}

				var daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc['gradYear']), schedule.day, lateStart);

				// If schedule is null for some reason, default back to portal schedule
				if(daySchedule === null) {
					schedule.classes = portalSchedule;
				} else {

					// Keep track of original lunch start and end
					var lunchSpan = [];

					for(var i = 0; i < daySchedule.length; i++) {
						var block = daySchedule[i];
						if(block.includeLunch) {
							lunchSpan.push({
								start: block.start,
								end: block.end
							});
						}
					}

					// Overlap Portal classes over default
					schedule.classes = ordineSchedule(daySchedule, portalSchedule);

					// Go through lunch again and determine if half of lunch as been overlapped by another class.
					// If so, change the incdeLunch period to just 'Lunch' if no period has overlapped, it probably means the user has a free period.
					// Go through schedule classes again to add aliases to blocks from block schedule
					for(var i = 0; i < schedule.classes.length; i++) {
						var scheduleClass = schedule.classes[i];

						// Check if it was an original 'includeLunch' period
						if(scheduleClass.includeLunch && lunchSpan) {
							var sharedBlock = scheduleClass.block;
							// delete scheduleClass.block;
							scheduleClass.class = genericBlocks.lunch;

							// Check if the lunch period is the same as before overlap
							for(var j = 0; j < lunchSpan.length; j++) {
								if(scheduleClass.start === lunchSpan[j].start && scheduleClass.end === lunchSpan[j].end) {
									// It's a free period + lunch
									scheduleClass.class.name = 'Block ' + sharedBlock.toUpperCase() + ' + ' + scheduleClass.class.name;
									break;
								}
							}
						} else if(scheduleClass.block) {
							var block = scheduleClass.block;

							// It's a class from the block schedule. Create a class object for it
							if(typeof genericBlocks[block] === 'object') {
								scheduleClass.class = genericBlocks[block];
							} else {
								var blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
								var color = prisma(block).hex;
								scheduleClass.class = {
									name: blockName,
									teacher: {
										prefix: '',
										firstName: '',
										lastName: ''
									},
									type: 'other',
									block: block,
									color: color,
									textDark: prisma.shouldTextBeDark(color)
								};
							}
						}

						schedule.classes[i] = {
							class: scheduleClass.class,
							start: scheduleClass.start,
							end: scheduleClass.end
						};
					}
				}

				callback(null, true, schedule);
			});
		}
	});
}

/**
 * Combine user's configured classes with a block schedule. Returns an array containing block schedule with possibly configured classes.
 * @function combineClassesSchedule
 *
 * @param {Object} date - Date object for date to create schedule
 * @param {Object} schedule - Array of block schedule from JSON
 * @param {Object} blocks - Object with block as key, class object as value
 * @returns {Object}
 */

function combineClassesSchedule(date, schedule, blocks) {
	date = moment(date);
	if(!_.isArray(schedule)) schedule = [];
	if(typeof blocks !== 'object') blocks = {};

	// Loop through schedule
	var combinedSchedule = [];

	for(var i = 0; i < schedule.length; i++) {
		var blockObject = schedule[i];

		// Check if user has configured a class for this block
		var block = blockObject.block;
		var scheduleClass = blocks[block];

		if(typeof scheduleClass !== 'object') {
			var blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
			var color = prisma(block).hex;
			scheduleClass = {
				name: blockName,
				teacher: {
					prefix: '',
					firstName: '',
					lastName: ''
				},
				type: 'other',
				block: 'other',
				color: color,
				textDark: prisma.shouldTextBeDark(color)
			}
		}

		// Check if we should also be adding lunch
		if(blockObject.includeLunch) {
			scheduleClass.name += ' + Lunch!';
		}

		combinedSchedule.push({
			class: scheduleClass,
			start: blockObject.start,
			end: blockObject.end
		});
	}

	JSON.stringify(combinedSchedule);
	return combinedSchedule;
}

/**
 * Combination of order and combine. Returns an array of the new class combined with other classes in proper order
 * @function ordineSchedule
 *
 * @param {Object} baseSchedule - Array of existing classes
 * @param {Object} addClasses - Array of block objects to add to the class array. Will override base classes if conflict!
 * @returns {Object}
 */

function ordineSchedule(baseSchedule, addClasses) {
	if(!_.isArray(baseSchedule)) baseSchedule = [];
	if(!_.isArray(addClasses)) addClasses = [];

	// Add each class to the base schedule
	for(var i = 0; i < addClasses.length; i++) {
		var addClass = addClasses[i];

		var start = moment(addClass.start);
		var end   = moment(addClass.end);

		// Keep track of conflicting indexes
		var conflictIndexes = [];

		// Move other (if any) events with conflicting times
		for(var j = 0; j < baseSchedule.length; j++) {
			var scheduleClass = baseSchedule[j];

			var blockStart = moment(scheduleClass.start);
			var blockEnd   = moment(scheduleClass.end);

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
				endRelation = 'same start';

			} else if(end.isSame(blockEnd)) {
				endRelation = 'same end';

			} else if(end.isBefore(blockStart)) {
				endRelation = 'before';

			} else if(end.isAfter(blockEnd)) {
				endRelation = 'after';

			} else if(end.isAfter(blockStart) && end.isBefore(blockEnd)) {
				endRelation = 'inside';
			}

			// If new event is totally unrelated to the block, just ignore
			if(startRelation === 'same end' || startRelation === 'after') continue;
			if(endRelation === 'same start' || endRelation === 'before') continue;

			// If start is before or equal to block start
			if(startRelation === 'before' || startRelation === 'same start') {
				// If end is inside, we can still keep half of the block
				if(endRelation === 'inside') {
					baseSchedule[j].start = end.clone();
				}

				// If new class completely engulfs the block, delete
				if(endRelation === 'same end' || endRelation === 'after') {
					// Only push to array if index isn't already in array
					if(!_.contains(conflictIndexes, j)) {
						conflictIndexes.push(j);
					}
				}
			}

			// If end is inside the block
			if(startRelation === 'inside') {
				// If new event is inside block
				if(endRelation === 'inside') {
					// Split event into two
					var newBlock = JSON.parse(JSON.stringify(scheduleClass));
					var oldEnd   = scheduleClass.end.clone();

					// Set old block to beginning of next block
					baseSchedule[j].end = start.clone();
					// Set new block start where the next block left off
					newBlock.start = end.clone();
					// Also make sure end is a moment object because it goes through JSON.stringify
					newBlock.end = moment(newBlock.end);

					baseSchedule.push(newBlock);
				}

				if(endRelation === 'same end' || endRelation === 'after') {
					baseSchedule[j].end = start.clone();
				}
			}

			// If same times, delete
			if(startRelation === 'same start' && endRelation === 'same end') {
				// Only push to array if index isn't already in array
				if(!_.contains(conflictIndexes, j)) {
					conflictIndexes.push(j);
				}
			}
		}

		// Delete all conflicting classes
		conflictIndexes.sort();
		var deleteOffset = 0;
		for(var j = 0; j < conflictIndexes.length; j++) {
			var index = conflictIndexes[j] - deleteOffset++;
			baseSchedule.splice(index, 1);
		}

		// After all other classes are accounted for, add this new class
		baseSchedule.push(addClass);
	}

	// Delete all classes that start and end at the same time, or end is before start
	baseSchedule = baseSchedule.filter(value => value.start.unix() < value.end.unix());

	// Reorder schedule because of deleted classes
	baseSchedule.sort((a, b) => a.start - b.start);

	return baseSchedule;
}

module.exports.get    = getSchedule;
module.exports.ordine = ordineSchedule;
