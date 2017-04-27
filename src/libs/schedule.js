'use strict';

/**
 * @file Uses Portal schedule feed and Configured Classes to format the user's schedule
 * @module schedule
 */
const _ = require('underscore');
const aliases = require(__dirname + '/aliases.js');
const asyncLib = require('async');
const classes = require(__dirname + '/classes.js');
const moment = require('moment');
const users = require(__dirname + '/users.js');
const prisma = require('prisma');
const portal = require(__dirname + '/portal.js');
const blockSchedule = require(__dirname + '/blockSchedule.js');

// Mappings for default blocks
const genericBlocks = {
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
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}

	const scheduleDate = moment(date).startOf('day');
	const scheduleNextDay = scheduleDate.clone().add(1, 'day');

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
		let lateStart = false;
		let defaultStart = null;
		if(scheduleDate.day() !== 3) {
			// Not Wednesday, school starts at 8
			defaultStart = scheduleDate.clone().hour(8);
		} else {
			// Wednesday, school starts at 9
			defaultStart = scheduleDate.clone().hour(9);
			lateStart = true;
		}
		const defaultEnd = scheduleDate.clone().hour(15).minute(15);

		// Default color for class
		const defaultColor = '#A5001E';

		const defaultClasses = [{
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

				const schedule = {
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
				const blocks = {};
				for(let block of results.classes) {
					blocks[block.block] = block; // Very descriptive
				}

				// Include generic blocks in with the supplied blocks
				for(let key of Object.keys(genericBlocks)) {
					if(typeof blocks[key] !== 'object') {
						blocks[key] = genericBlocks[key];
					}
				}

				const schedule = {
					day: results.day,
					special: false,
					classes: [],
					allDay: []
				};

				// Look up Block Schedule for user
				let daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc['gradYear']), results.day, lateStart);

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
							asyncCallback(null, { hasURL, cal });
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

				let portalSchedule = [];
				const schedule = {
					day: null,
					special: false,
					classes: [],
					allDay: []
				};

				// Keep track of which classes we need to delete
				const conflictIndexes = [];

				// Go through all the events in the Portal calendar
				for(let index of Object.keys(results.portal.cal)) {
					const calEvent = results.portal.cal[index];
					if(typeof calEvent.summary !== 'string') continue;

					const start = moment(calEvent['start']);
					const end = moment(calEvent['end']);

					// Make sure the event isn't all whacky
					if(end.isBefore(start)) continue;

					// Check if it's an all-day event
					if(start.isSameOrBefore(scheduleDate) && end.isSameOrAfter(scheduleNextDay)) {
						// See if valid day
						if(portal.validDayRotation.test(calEvent.summary)) {
							// Get actual day
							schedule.day = parseInt(calEvent.summary.match(/[1-6]/)[0]);
							continue;
						}

						// Check if special schedule
						const lowercaseSummary = calEvent.summary.toLowerCase();
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
							const blockPart = _.last(calEvent.summary.match(portal.portalSummaryBlock));
							let block = 'other';

							if(blockPart) {
								block = _.last(blockPart.match(/[A-G]/g)).toLowerCase();
							}

							// Generate random color
							let color = prisma(calEvent.summary).hex;

							// RegEx for determining block and stuff is a bit intense; therefore, we should cache it. [sp1a]
							results.aliases.portal[calEvent.summary] = {
								portal: true,
								name: portal.cleanUp(calEvent.summary),
								teacher: {
									prefix: '',
									firstName: '',
									lastName: ''
								},
								block,
								type: 'other',
								color,
								textDark: prisma.shouldTextBeDark(color)
							};
						}

						// Add block into Portal Schedule array
						portalSchedule.push({
							class: results.aliases.portal[calEvent.summary],
							start,
							end
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

				const daySchedule = blockSchedule.get(scheduleDate, users.gradYearToGrade(userDoc['gradYear']), schedule.day, lateStart);

				// If schedule is null for some reason, default back to portal schedule
				if(daySchedule === null) {
					schedule.classes = portalSchedule;
				} else {

					// Keep track of original start and end of blocks detecting overlap
					for(let i = 0; i < daySchedule.length; i++) {
						const block = daySchedule[i];
						if(block.noOverlapAddBlocks) {
							daySchedule[i].originalStart = block.start;
							daySchedule[i].originalEnd = block.end;
						}
					}

					// Overlap Portal classes over default
					schedule.classes = ordineSchedule(daySchedule, portalSchedule);

					// Loop through all the blocks. If a block has a `noOverlapAddBlocks` property
					// and the current start and end times are the same as the original, add the
					// block(s) specified. This is used for inserting the free period for people
					// whose free period that determines their lunch.

					// People with free period always have first lunch. Since free periods don't
					// show up on the portal, there's no overlap from a portal class which
					// determines if they have first or second lunch; therefore, we must add it
					// ourselves.
					for(let i = 0; i < schedule.classes.length; i++) {
						const block = schedule.classes[i];
						if(block.noOverlapAddBlocks) {
							// If no overlap, add blocks
							if(block.originalStart === block.start && block.originalEnd === block.end) {

								// Before combining blocks to existing schedule, convert to moment objects
								for(let i = 0; i < block.noOverlapAddBlocks.length; i++) {
									const addBlock = block.noOverlapAddBlocks[i];

									const startTime = addBlock.start.split(':');
									block.noOverlapAddBlocks[i].start = scheduleDate.clone().hour(startTime[0]).minute(startTime[1]);

									const endTime = addBlock.end.split(':');
									block.noOverlapAddBlocks[i].end = scheduleDate.clone().hour(endTime[0]).minute(endTime[1]);
								}

								schedule.classes = ordineSchedule(schedule.classes, block.noOverlapAddBlocks);
							}
							delete schedule.classes[i].originalStart;
							delete schedule.classes[i].originalEnd;
						}
					}

					// Check for any blocks in the schedule that have the `block` property. This means it's directly from the
					// schedule JSON. See if there's any pre-configured classes we should insert instead, otherwise do our best
					// to make a formatted MyMICDS class object.
					for(let i = 0; i < schedule.classes.length; i++) {
						const scheduleClass = schedule.classes[i];

						if(scheduleClass.block) {
							const block = scheduleClass.block;

							// It's a class from the block schedule. Create a class object for it
							if(typeof genericBlocks[block] === 'object') {
								scheduleClass.class = genericBlocks[block];
							} else {
								const blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
								const color = prisma(block).hex;
								scheduleClass.class = {
									name: blockName,
									teacher: {
										prefix: '',
										firstName: '',
										lastName: ''
									},
									type: 'other',
									block,
									color,
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
	const combinedSchedule = [];

	for(let blockObject of schedule) {
		// Check if user has configured a class for this block
		const block = blockObject.block;
		let scheduleClass = blocks[block];

		if(typeof scheduleClass !== 'object') {
			const blockName = 'Block ' + block[0].toUpperCase() + block.slice(1);
			const color = prisma(block).hex;
			scheduleClass = {
				name: blockName,
				teacher: {
					prefix: '',
					firstName: '',
					lastName: ''
				},
				type: 'other',
				block: 'other',
				color,
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
	for(let addClass of addClasses) {
		const start = moment(addClass.start);
		const end   = moment(addClass.end);

		// Keep track of conflicting indexes
		const conflictIndexes = [];

		// Move other (if any) events with conflicting times
		for(let i = 0; i < baseSchedule.length; i++) {
			const scheduleClass = baseSchedule[i];

			const blockStart = moment(scheduleClass.start);
			const blockEnd   = moment(scheduleClass.end);
			// Determine start/end times relative to the class we're currently trying to add
			let startRelation = null;
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

			let endRelation = null;
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
					baseSchedule[i].start = end.clone();
				}

				// If new class completely engulfs the block, delete
				if(endRelation === 'same end' || endRelation === 'after') {
					// Only push to array if index isn't already in array
					if(!_.contains(conflictIndexes, i)) {
						conflictIndexes.push(i);
					}
				}
			}

			// If end is inside the block
			if(startRelation === 'inside') {
				// If new event is inside block
				if(endRelation === 'inside') {
					// Split event into two
					const newBlock = JSON.parse(JSON.stringify(scheduleClass));
					let oldEnd = scheduleClass.end.clone();

					// Set old block to beginning of next block
					baseSchedule[i].end = start.clone();
					// Set new block start where the next block left off
					newBlock.start = end.clone();
					// Also make sure end is a moment object because it goes through JSON.stringify
					newBlock.end = moment(newBlock.end);

					baseSchedule.push(newBlock);
				}

				if(endRelation === 'same end' || endRelation === 'after') {
					baseSchedule[i].end = start.clone();
				}
			}

			// If same times, delete
			if(startRelation === 'same start' && endRelation === 'same end') {
				// Only push to array if index isn't already in array
				if(!_.contains(conflictIndexes, i)) {
					conflictIndexes.push(i);
				}
			}
		}

		// Delete all conflicting classes
		conflictIndexes.sort();
		let deleteOffset = 0;
		for(let conflictIndex of conflictIndexes) {
			const index = conflictIndex - deleteOffset++;
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
