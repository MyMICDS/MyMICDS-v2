'use strict';

/**
 * @file Determines what a user's schedule should be according to the generic block schedule
 * @module blockSchedule
 */

var _      = require('underscore');
var moment = require('moment');
var prisma = require('prisma');
var users  = require(__dirname + '/users.js');

// Schedules
var highschoolSchedule   = require(__dirname + '/../schedules/highschool.json');
var middleschoolSchedule = {
	8: require(__dirname + '/../schedules/grade8.json'),
	7: require(__dirname + '/../schedules/grade7.json'),
	6: require(__dirname + '/../schedules/grade6.json'),
	5: require(__dirname + '/../schedules/grade5.json'),
};

var validBlocks = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'activities',
	'advisory',
	'collaborative',
	'community',
	'enrichment',
	'lunch'
];

var validTypes = [
	'sam',  // Science, Art, Math
	'wleh', // World Language, English, History
	'other' // Free Period or something else
];

var samTypes = [
	'art',
	'math',
	'science'
];

var wlehTypes = [
	'english',
	'history',
	'spanish',
	'latin',
	'mandarin',
	'german',
	'french'
];

/**
 * Converts a classes.js type into a valid schedule type
 * @function convertType
 *
 * @param {string} type - Type of class
 * @returns {string}
 */

function convertType(type) {
	if(_.contains(samTypes, type)) return 'sam';
	if(_.contains(wlehTypes, type)) return 'wleh';
	return 'other';
}

/**
 * Returns a user's generic schedule according to their grade and their class names for each corresponding block. Returns null if something's invalid.
 * @function getSchedule
 *
 * @param {Number} day - What schedule rotation day it is (1-6)
 * @param {Boolean} lateStart - Whether or not schedule should be the late start variant
 * @param {Number} grade - User's grade (Note: We only support middleschool and highschool schedules)
 * @param {Object} blocks - A JSON with they keys as the blocks, and value is the class object
 *
 * @returns {Object}
 */

function getSchedule(date, day, lateStart, grade, blocks) {

	if(typeof blocks !== 'object') blocks = {};

	// Add default blocks
	if(typeof blocks.activities === 'undefined') {
		blocks.activities = {
			name: 'Activities',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#FF6347'
		};
	}
	if(typeof blocks.advisory === 'undefined') {
		blocks.advisory = {
			name: 'Advisory',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#EEE' // Sophisticated white
		};
	}
	if(typeof blocks.collaborative === 'undefined') {
		blocks.collaborative = {
			name: 'Collaborative Work',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#29ABE2'
		};
	}
	if(typeof blocks.community === 'undefined') {
		blocks.community = {
			name: 'Community',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#AA0031'
		};
	}
	if(typeof blocks.enrichment === 'undefined') {
		blocks.enrichment = {
			name: 'Enrichment',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#FF4500'
		};
	}
	if(typeof blocks.flex === 'undefined') {
		blocks.flex = {
			name: 'Flex',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#CC33FF'
		};
	}
	if(typeof blocks.lunch === 'undefined') {
		blocks.lunch = {
			name: 'Lunch!',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#116C53'
		};
	}
	if(typeof blocks.recess === 'undefined') {
		blocks.recess = {
			name: 'Recess',
			teacher: {
				prefix: '',
				firstName: '',
				lastName: ''
			},
			type: 'other',
			block: 'other',
			color: '#FFFF00'
		};
	}

	// Make sure date is a moment object
	date = moment(date);

	// If invalid day, return empty schedule because school isn't in session
	if(day === null) return [];
	day = parseInt(day);
	if(typeof day !== 'number' || day % 1 !== 0 || 1 > day || day > 6) {
		return null;
	}

	if(typeof grade !== 'number' || grade % 1 !== 0 || -1 > grade || grade > 12) {
		return null;
	}

	var schoolName = users.gradeToSchool(grade);

	// We don't have lowerschool schedules
	if(schoolName === 'lowerschool') return null;

	// Make sure all blocks are valid
	for(var i = 0; i < validBlocks.length; i++) {
		var block = validBlocks[i];

		if(typeof blocks[block] === 'undefined') {
			var blockName = block[0].toUpperCase() + block.slice(1);
			if(blockName.length === 1) {
				blockName = 'Block ' + blockName;
			}

			blocks[block] = {
				name: blockName,
				teacher: {
					prefix: '',
					firstName: '',
					lastName: ''
				},
				type: 'other',
				block: block,
				color: prisma(blockName).hex.toUpperCase()
			}
		}
	}

	// User's final schedule
	var userSchedule = [];

	// Use highschool schedule if upperschool
	if(schoolName === 'upperschool') {
		// Determine if lowerclassman (9 - 10) or upperclassman (11 - 12)
		var lowerclass = false;
		var upperclass = true;
		if(grade === 9 || grade === 10) {
			lowerclass = true;
			upperclass = false;
		}

		// Get lunch type and determine what type it is
		var lunchBlock = highschoolSchedule['day' + day].lunchBlock;
		var lunchBlockType = null;

		var sam = false;
		var wleh = false;
		var other = false;

		if(lunchBlock) {
			var lunchBlockType = convertType(blocks[lunchBlock].type);
		}

		if(lunchBlockType === 'sam') {
			sam = true;
		} else if(lunchBlockType === 'wleh') {
			wleh = true;
		} else {
			other = true;
		}

		// Loop through JSON and append classes to user schedule
		var jsonSchedule = highschoolSchedule['day' + day][lateStart ? 'lateStart' : 'regular'];

		for(var i = 0; i < jsonSchedule.length; i++) {
			var jsonBlock = jsonSchedule[i];

			// Check for any restrictions on the schedule
			if(typeof jsonBlock.sam !== 'undefined') {
				if(jsonBlock.sam !== sam) continue;
			}
			if(typeof jsonBlock.wleh !== 'undefined') {
				if(jsonBlock.wleh !== wleh) continue;
			}
			if(typeof jsonBlock.other !== 'undefined') {
				if(jsonBlock.other !== other) continue;
			}

			if(typeof jsonBlock.lowerclass !== 'undefined') {
				if(jsonBlock.lowerclass !== lowerclass) continue;
			}
			if(typeof jsonBlock.upperclass !== 'undefined') {
				if(jsonBlock.lowerclass !== upperclass) continue;
			}

			// Get start and end moment objects
			var startTime = jsonBlock.start.split(':');
			var start = date.clone().hour(startTime[0]).minute(startTime[1]);

			var endTime = jsonBlock.end.split(':');
			var end = date.clone().hour(endTime[0]).minute(endTime[1]);

			var insertBlock = blocks[jsonBlock.block];
			if(jsonBlock.includeLunch) {
				insertBlock.name += ' + Lunch';
			}

			// Push to user schedule
			userSchedule.push({
				start: start,
				end  : end,
				class: insertBlock
			});
		}

		return userSchedule;

	} else if(schoolName === 'middleschool') {

		// Loop through JSON and append classes to user schedule
		var jsonSchedule = middleschoolSchedule[grade]['day' + day][lateStart ? 'lateStart' : 'regular'];

		for(var i = 0; i < jsonSchedule.length; i++) {
			var jsonBlock = jsonSchedule[i];

			// Get start and end moment objects
			var startTime = jsonBlock.start.split(':');
			var start = date.clone().hour(startTime[0]).minute(startTime[1]);

			var endTime = jsonBlock.end.split(':');
			var end = date.clone().hour(endTime[0]).minute(endTime[1]);

			// Push to user schedule
			userSchedule.push({
				start: start,
				end  : end,
				class: blocks[jsonBlock.block]
			});
		}

		return userSchedule;

	} else {
		return null;
	}
}

module.exports.get = getSchedule;
