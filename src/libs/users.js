'use strict';

/**
 * @file User management functions
 * @module users
 */
const _ = require('underscore');
const dates = require(__dirname + '/dates.js');
const moment = require('moment');

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

async function getUser(db, user) {
	if (typeof db !== 'object')	throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');

	const userdata = db.collection('users');

	try {
		// Query database to find possible user
		const docs = await userdata.find({ user }).toArray();

		let isUser = false;
		let userDoc = null;

		if (docs.length !== 0) {
			isUser = true;
			userDoc = docs[0];
		}

		return { isUser, userDoc };
	} catch (e) {
		throw new Error('There was a problem querying the database!')
	}

}

/**
 * Retrieves basic information about a specific user
 * @function getInfo
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {Boolean} privateInfo - Whether to include sensitive information such as canvasURL and portalURL. Set to true if only the user is viewing it. Defaults to false.
 * @param {getInfoCallback} callback - Callback
 */

/**
 * Returns basic information about the user
 * @callback getInfoCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} userInfo - Object containing information about the user. Null if error.
 */

async function getInfo(db, user, privateInfo) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof privateInfo !== 'boolean') privateInfo = false;

	const { isUser, userDoc } = await getUser(db, user);

	if (!isUser) throw new Error('User doesn\'t exist!');

	// Create userInfo object and manually move values from database.
	// We don't want something accidentally being released to user.
	const userInfo = {};
	userInfo.user      = userDoc['user'];
	userInfo.password  = 'Hunter2'; /** @TODO: Fix glitch? Shows up as ******* for me. */
	userInfo.firstName = userDoc['firstName'];
	userInfo.lastName  = userDoc['lastName'];
	userInfo.gradYear  = userDoc['gradYear'];
	userInfo.grade     = gradYearToGrade(userInfo['gradYear']);
	userInfo.school    = gradeToSchool(userInfo['grade']);

	if (privateInfo) {
		if (typeof userDoc['canvasURL'] === 'string') {
			userInfo.canvasURL = userDoc['canvasURL'];
		} else {
			userInfo.canvasURL = null;
		}

		if (typeof userDoc['portalURL'] === 'string') {
			userInfo.portalURL = userDoc['portalURL'];
		} else {
			userInfo.portalURL = null;
		}
	}

	return userInfo;
}

/**
 * Change basic user information such as name or grade
 * @function changeInfo
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {Object} info - Information to change about user.
 * @param {string} [info.firstName] - First name of user
 * @param {string} [info.lastName] - Last name of user
 * @param {Number} [info.gradYear] - Graduation year of user. Set null if faculty.
 * @param {changeInfoCallback} callback - Callback
 */

/**
 * Returns whether successful or not.
 * @callback changeInfoCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function changeInfo(db, user, info) {
	if (typeof info !== 'object') throw new Error('Invalid information!');

	// I mean if they want nothing changed, I guess there's no error
	if (_.isEmpty(info)) return;

	const { isUser, userDoc } = await getUser(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	// See what information the user wants changed
	const set = {};

	if (typeof info.firstName === 'string') {
		set.firstName = info.firstName;
	}
	if (typeof info.lastName === 'string') {
		set.lastName = info.lastName;
	}
	if (info.gradYear === null) {
		set.gradYear = null;
	} else if (typeof info.gradYear === 'number' && info.gradYear % 1 === 0 && !_.isNaN(info.gradYear)) {
		set.gradYear = info.gradYear;
	}

	if (_.isEmpty(set)) return;

	// Update data
	const userdata = db.collection('users');

	try {
		await userdata.updateOne({ _id: userDoc['_id'], user }, { $set: set }, { upsert: true });
	} catch (e) {
		throw new Error('There was a problem updating the databse!');
	}
}

/**
 * Converts a graduation year to a grade.
 * If the grade is Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then the respective -1 and 0 integers are returned.
 * @function gradYearToGrade
 * @param {Number} gradYear - Graduation year
 * @returns {Number}
 */

function gradYearToGrade(gradYear) {
	if (typeof gradYear !== 'number' || gradYear % 1 !== 0) return null;

	const current = moment();
	const differenceYears = current.year() - gradYear;
	let grade = 12 + differenceYears;

	// If last day of school has already passed, you completed a grade of school
	const schoolEnd = dates.lastFridayMay();
	if (current.isAfter(schoolEnd)) {
		grade++;
	}

	return grade;
}

/**
 * Converts a grade to a graduation year.
 * If you want to enter the grade Junior-Kindergarten (JK) or Senior-Kindergarten (SK) then insert the respective integers -1 and 0.
 * @function gradeToGradYear
 * @param {Number} grade - Grade
 * @returns {Number}
 */

function gradeToGradYear(grade) {
	if (typeof grade !== 'number' || grade % 1 !== 0) return null;

	const current = moment();

	// If last day of school has already passed, round year down
	const schoolEnd = dates.lastFridayMay();
	if (current.isAfter(schoolEnd)) {
		grade--;
	}

	const differenceYears = grade - 12;
	return current.year() - differenceYears;
}

/**
 * Determines which school a grade belongs to. If grade is above 12, returns 'upperschool'. If grade is below -1, returns 'lowerschool'.
 * Also if grade isn't a number, it will also default to 'upperschool'.
 * @function gradeToSchool
 * @param {Number} grade - Grade
 * @returns {string}
 */

function gradeToSchool(grade) {
	if(typeof grade !== 'number' || grade >= 9) return 'upperschool';
	if(grade < 5) return 'lowerschool';
	return 'middleschool';
}

module.exports.get        	   = getUser;
module.exports.getInfo         = getInfo;
module.exports.changeInfo      = changeInfo;
module.exports.gradYearToGrade = gradYearToGrade;
module.exports.gradeToGradYear = gradeToGradYear;
module.exports.gradeToSchool   = gradeToSchool;
