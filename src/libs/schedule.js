'use strict';

/**
 * @file Determines what a user's schedule should be according to the generic block schedule
 * @module schedule
 */

var _ = require('underscore');
var users = require(__dirname + '/users.js');

// Schedules
var highschoolSchedule = require(__dirname + '/../schedules/highschool.json');

var validBlocks = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g'
];

var validTypes = [
	'sam',  // Science, Art, Math
	'wleh', // World Language, English, History
	'free'  // Free Period
];

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

function getSchedule(day, lateStart, grade, blocks) {
	if(typeof day !== 'number' || day % 1 !== 0 || 1 > grade || grade > 6) {
		return null;
	}

	if(typeof grade !== 'number' || grade % 1 !== 0 || -1 > grade || grade > 12) {
		return null;
	}

	var schoolName = users.gradeToSchool(grade);

	// If lowerschool, return null
	if(schoolName === 'lowerschool') {
		return null;
	}

	// Make sure all blocks are valid
	for(var i = 0; i < validBlocks.length; i++) {
		var block = validBlocks[i];

		// Make sure block is in blocks
		if(typeof blocks[block] === 'undefined') {
			return null;
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
		var scheduleLunchBlock = highschoolSchedule['day' + day].lunchBlock;
		var lunchBlockType = null;

		var sam = null;
		var wleh = null;

		if(lunchBlock) {
			lunchBlockType = blocks[lunchBlock].type;

			if(lunchBlockType === 'sam') {
				sam = true;
				wleh = false;
			} else if(lunchBlockType === 'wleh') {
				sam = true;
				wleh = false;
			}
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

			if(typeof jsonBlock.lowerclass !== 'undefined') {
				if(jsonBlock.lowerclass !== lowerclass) continue;
			}
			if(typeof jsonBlock.upperclass !== 'undefined') {
				if(jsonBlock.lowerclass !== upperclass) continue;
			}

			// Push to user schedule
			userSchedule.push(blocks[jsonBlock.type]);
		}

		return userSchedule;

	} else if(grade === 8) {

	} else if(grade === 7) {

	} else if(grade === 6) {

	} else if(grade === 5) {

	} else {
		return null;
	}
}
