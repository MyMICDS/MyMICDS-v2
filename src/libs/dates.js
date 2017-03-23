'use strict';

/**
 * @file Wish I had one
 * @module dates
 */
const _ = require('underscore');
const moment = require('moment');
const portal = require(__dirname + '/portal.js');

/**
 * Returns a Moment.js object the date and time school is going to end
 * Based on two consecutive years, we have gather enough data and deeply analyzed that the last day of school is _probably_ the last Friday of May.
 * @function lastFridayMay
 * @param {Number} year - Which May to get last Friday from
 * @returns {Object}
 */

function lastFridayMay(year) {
	let current = moment();
	if(typeof year !== 'number' || year % 1 !== 0) {
		year = current.year();
	}

	let lastDayOfMay = moment().year(year).month('May').endOf('month').startOf('day').hours(11).minutes(30);

	/*
	 * Fun fact: This is literally the only switch statement in the whole MyMICDS codebase.
	 */

	let lastDay;
	switch(lastDayOfMay.day()) {
		case 5:
			// If day is already Friday
			lastDay = lastDayOfMay;
			break;

		case 6:
			// Last day is Sunday
			lastDay = lastDayOfMay.subtract(1, 'day');
			break;

		default:
			// Subtract day of week (which cancels it out) and start on Saturday.
			// Then subtract to days to get from Saturday to Friday.
			lastDay = lastDayOfMay.subtract(lastDayOfMay.day() + 2, 'days');
			break;
	}

	return lastDay;
}

/**
 * Returns a Moment.js object when the next last day of school is.
 * Based on two consecutive years, we have gather enough data and deeply analyzed that the last day of school is _probably_ the last Friday of May.
 * @function schoolEnds
 * @returns {Object}
 */

function schoolEnds() {
	let current = moment();
	let lastDayThisYear = lastFridayMay(current.year());

	if(lastDayThisYear.isAfter(current)) {
		return lastDayThisYear;
	} else {
		return lastFridayMay(current.year() + 1);
	}
}

/**
 * Returns an array containing the school years of a given date
 * @function getSchoolYear
 * @param {Object} date - Date object
 * @returns {Object}
 */

function getSchoolYear(date) {
	date = moment(date);
	let lastDayThisYear = lastFridayMay(date.year());

	// If after summer, include next year. Otherwise, include last year
	if(date.isAfter(lastDayThisYear)) {
		return [date.year(), date.year() + 1];
	} else {
		return [date.year() - 1, date.year()];
	}
}

/**
 * Returns the upcoming breaks and long weekends within the next 12 months
 * @function getDaysOff
 * @callback {getDaysOffCallback} callback - Callback
 */

/**
 * Returns an object of upcoming breaks and long weekends
 * @callback getDaysOffCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} breaks - Object of breaks. Null if failure.
 */

function getDaysOff(callback) {
	if(typeof callback !== 'function') {
		return;
	}

	portal.getDayRotations((err, days) => {
		if(err) {
			callback(err, null);
			return;
		}

		let dayPointer = moment().startOf('day').subtract(portal.portalRange.previous, 'months');
		let dayMax = moment().startOf('day').add(portal.portalRange.upcoming, 'months');

		// Array of moment.js objects which we have a day off
		let daysOff = [];

		// Go through all days
		while(dayPointer.isSameOrBefore(dayMax)) {

			// Check if there's no rotation day and that it isn't the weekend
			if(!(days[dayPointer.year()] && days[dayPointer.year()][dayPointer.month() + 1] && days[dayPointer.year()][dayPointer.month() + 1][dayPointer.date()])) {
				daysOff.push(dayPointer.clone());
			}

			dayPointer.add(1, 'day');
		}

		callback(null, daysOff);
	});
}

/**
 * Returns the user's breaks according to days off
 * @function getBreaks
 * @param {getBreaksCallback} callback - Callback
 */

/**
 * Returns an object with different properties containing moment dates
 * @callback getBreaksCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} breaks - Object containing breaks. Null if error.
 */

function getBreaks(callback) {
	if(typeof callback !== 'function') {
		return;
	}

	// Get array of days that have no day rotation
	getDaysOff((err, days) => {
		if(err) {
			callback(err, null);
			return;
		}

		// Group days off into arrays
		let i = 0;
		let groupedDays = days.reduce((stack, b) => {
			let cur = stack[i];
			let a = cur ? cur[cur.length - 1] : 0;

			if (b - a > 86400000) {
				i++;
			}

			if (!stack[i]) {
				stack[i] = [];
			}

			stack[i].push(b);

			return stack;

		}, []);
		// For some reason first element is always undefined or something
		groupedDays.shift();

		/*
		 * Categorize breaks
		 *
		 * Weekends - Breaks that are exclusively Saturday and Sunday
		 * Long Weekends - Breaks that include Saturday and Sunday. Can include weekdays but cannot be more than a week (7 days).
		 * Vacations - Breaks that are more than a week (7 days).
		 * Other - For some reason if there's a day off in the middle of the week.
		 */

		let categorizedBreaks = {
			weekends: [],
			longWeekends: [],
			vacations: [],
			other: []
		};

		console.log('grouped ays', groupedDays);
		for(let group of groupedDays) {
			// Check if weekend
			if(group.length === 2 && group[0].day() === 6 && group[1].day() === 0) {
				categorizedBreaks.weekends.push({
					start: group[0],
					end: group[group.length - 1]
				});
				continue;
			}

			// Check if Saturday / Sunday are included in break
			let weekendIncluded = false;
			for(let dayObj of group) {
				if(dayObj.day() === 6 || dayObj.day() === 0) {
					weekendIncluded = true;
				}
			}

			if(weekendIncluded) {
				if(group.length < 7) {
					categorizedBreaks.longWeekends.push({
						start: group[0],
						end: group[group.length - 1]
					});
				} else {
					categorizedBreaks.vacations.push({
						start: group[0],
						end: group[group.length - 1]
					});
				}
			} else {
				categorizedBreaks.other.push({
					start: group[0],
					end: group[group.length - 1]
				});
			}

		}

		callback(null, categorizedBreaks);
	});
}

module.exports.lastFridayMay = lastFridayMay;
module.exports.schoolEnds    = schoolEnds;
module.exports.getSchoolYear = getSchoolYear;
module.exports.getBreaks     = getBreaks;
