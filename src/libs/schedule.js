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
 * @param {Number} grade - User's grade (Note: We only support middleschool and highschool schedules)
 * @param {Object} blocks - A JSON with they keys as the blocks, and value is another object with 'name' and 'type'
 *
 * @returns {Object}
 */

function getSchedule(grade, blocks) {
	if(typeof grade !== 'number' || grade % 1 !== 0 || -1 > grade || grade > 12) {
		return null;
	}

	// Make sure all blocks are valid
	for(var i = 0; i < validBlocks.length; i++) {
		var block = validBlocks[i];

		// Make sure block is in blocks
		if(typeof blocks[block] === 'undefined') {
			return null;
		}

		// Default name to empty string
		blocks[block].name = blocks[block].name || '';

		// Make sure block is of a valid type
		if(!_.contains(validTypes, blocks[block].type)) return;
	}
}
