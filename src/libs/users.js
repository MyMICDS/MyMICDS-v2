'use strict';

/**
 * @file User management functions
 * @module users
 */

 var moment = require('moment');

/**
 * Get data about user
 * @function getUser
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {getUserCallback} callback - Callback
 */

/**
 * Callback after user id is retrieved
 * @callback getUserCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} isUser - True if there is a valid user, false if not. Null if error.
 * @param {Object} userDoc - Everything in the user's document. Null if error or no valid user.
 */

function getUser(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	var userdata = db.collection('users');
	// Query database to find possible user
	userdata.find({ user: user }).toArray(function(err, docs) {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null, null);
			return;
		}
		if(docs.length === 0) {
			callback(null, false, null)
		} else {
			callback(null, true, docs[0]);
		}

	});
}

/**
 * Returns a Moment.js object the date and time school is going to end
 * Based on two consecutive years, we have gather enough data and deeply analyzed that the last day of school is _probably_ the last Friday of May.
 * @function lastFridayMay
 * @param {Number} year - Which May to get last Friday from
 * @returns {Object}
 */

function lastFridayMay(year) {
	var current = moment();
	if(typeof year !== 'number' || year % 1 !== 0) {
		year = current.year();
	}

	var lastDayOfMay = moment().year(year).month('May').endOf('month').startOf('day').hours(11).minutes(30);

	/*
	 * Fun fact: This is literally the only switch statement in the whole MyMICDS codebase.
	 */

	switch(lastDayOfMay.day()) {
		case 5:
			// If day is already Friday
			var lastDay = lastDayOfMay;
		case 6:
			// Last day is Sunday
			var lastDay = lastDayOfMay.subtract(1, 'day');
		default:
			// Subtract day of week (which cancels it out) and start on Saturday.
			// Then subtract to days to get from Saturday to Friday.
			var lastDay = lastDayOfMay.subtract(lastDayOfMay.day() + 2, 'days');
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
	var current = moment();
	var lastDayThisYear = lastFridayMay();

	if(lastDayThisYear.isAfter(current)) {
		return lastDayThisYear;
	} else {
		return lastFridayMay(current.year() + 1);
	}
}

/**
 * Converts a graduation year to a grade.
 * If the grade is Pre-Kindergarten (PK) or Junior-Kindergarten (JK) then respective -1 and 0 integers are returned.
 * @function gradYearToGrade
 *
 * @param {Number} gradYear - Graduation year
 * @returns {Number}
 */

function gradYearToGrade(gradYear) {
	if(typeof gradYear !== 'number' || gradYear % 1 !== 0) return null;

	var current = moment();
	var differenceYears = current.year() - gradYear;
	var grade = 12 + differenceYears;

	// If last day of school has already passed, you completed a grade of school
	if(current.isAfter(schoolEnd)) {
		grade++;
	}

	return grade;
}

/**
 * Converts a grade to a graduation year.
 * If you want to enter the grade Pre-Kindergarten (PK) or Junior-Kindergarten (JK) then insert the respective integers -1 and 0.
 * @function gradeToGradYear
 *
 * @param {Number} grade - Grade
 * @returns {Number}
 */

function gradeToGradYear(grade) {
	if(typeof grade !== 'number' || grade % 1 !== 0) return null;

	var current = moment();

	// If last day of school has already passed, round year down
	var schoolEnd = lastFridayMay();
	if(current.isAfter(schoolEnd)) {
		grade--;
	}

	var differenceYears = grade - 12;
	var gradYear = current.year() - differenceYears;

	return gradYear;
}

module.exports.getUser = getUser;
module.exports.schoolEnds      = schoolEnds;
module.exports.gradYearToGrade = gradYearToGrade;
module.exports.gradeToGradYear = gradeToGradYear;
