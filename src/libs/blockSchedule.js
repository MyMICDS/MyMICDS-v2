'use strict';

/**
 * @file Determines what a user's schedule should be according to the generic block schedule
 * @module blockSchedule
 */
const _ = require('underscore');
const moment = require('moment');
const prisma = require('prisma');
const users = require(__dirname + '/users.js');

// Schedules
const highschoolSchedule = require(__dirname + '/../schedules/highschool.json');
const middleschoolSchedule = {
	8: require(__dirname + '/../schedules/grade8.json'),
	7: require(__dirname + '/../schedules/grade7.json'),
	6: require(__dirname + '/../schedules/grade6.json'),
	5: require(__dirname + '/../schedules/grade5.json'),
};

const validBlocks = [
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
	'lunch',
	'pe'
];

const validTypes = [
	'sam',  // Science, Art, Math
	'wleh', // World Language, English, History
	'other' // Free Period or something else
];

const samTypes = [
	'art',
	'math',
	'science'
];

const wlehTypes = [
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
 * @param {Object} date - Date to set date objects to. If null, will return regular strings with times in 24-hour time '15:15'
 * @param {Number} grade - User's grade (Note: We only support middleschool and highschool schedules)
 * @param {Number} day - What schedule rotation day it is (1-6)
 * @param {Boolean} lateStart - Whether or not schedule should be the late start variant
 *
 * @returns {Object}
 */

function getSchedule(date, grade, day, lateStart) {
	let i;
// Validate inputs
	if(date) {
		date = moment(date);
	} else {
		date = null;
	}
	grade = parseInt(grade);
	if(typeof grade !== 'number' || _.isNaN(grade) || -1 > grade || grade > 12) {
		return null;
	}
	day = parseInt(day);
	if(typeof day !== 'number' || _.isNaN(day) || 1 > day || day > 6) {
		return null;
	}
	lateStart = !!lateStart;

	const schoolName = users.gradeToSchool(grade);

	// We don't have lowerschool schedules
	if(schoolName === 'lowerschool') return null;

	// User's final schedule
	let userSchedule = [];

	// Use highschool schedule if upperschool
	if(schoolName === 'upperschool') {
		// Determine if lowerclassman (9 - 10) or upperclassman (11 - 12)
		let lowerclass = false;
		let upperclass = true;
		if(grade === 9 || grade === 10) {
			lowerclass = true;
			upperclass = false;
		}

		let sam = false;
		let wleh = false;
		let other = true;

		// Loop through JSON and append classes to user schedule
		let jsonSchedule = highschoolSchedule['day' + day][lateStart ? 'lateStart' : 'regular'];

		for(i = 0; i < jsonSchedule.length; i++) {
			let jsonBlock = jsonSchedule[i];

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

			// Push to user schedule
			userSchedule.push(jsonBlock);
		}

	} else if(schoolName === 'middleschool') {
		// Directly return JSON from middleschool schedule
		userSchedule = middleschoolSchedule[grade]['day' + day][lateStart ? 'lateStart' : 'regular'];
	}

	// Copy the JSON so we don't modify the original reference
	userSchedule = JSON.parse(JSON.stringify(userSchedule));

	// If date isn't null, set times relative to date object
	if(date && userSchedule) {
		for(i = 0; i < userSchedule.length; i++) {
			// Get start and end moment objects
			let startTime = userSchedule[i].start.split(':');
			userSchedule[i].start = date.clone().hour(startTime[0]).minute(startTime[1]);

			let endTime = userSchedule[i].end.split(':');
			userSchedule[i].end = date.clone().hour(endTime[0]).minute(endTime[1]);
		}
	}

	return userSchedule;
}

module.exports.blocks = validBlocks;
module.exports.get    = getSchedule;
