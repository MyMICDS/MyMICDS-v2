'use strict';

/**
 * @file Calculates usage statistics from the database.
 * @module stats
 */

var moment = require('moment');

/**
 * Get usage statistics
 * @function getStats
 *
 * @param {Object} db - Database connection
 * @param {getStatsCallback} callback - Callback
 */

/**
 * Callback after statistics are collected
 * @callback getStatsCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} statistics - Object containing statistics. Null if error.
 */

function getStats(db, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	var stats = {
		registered: {
			total: 0,
			today: 0,
			gradYears: {}
		},
		visitedToday: {
			total: 0,
			gradYears: {}
		}
	};
	var userdata = db.collection('users');

	// Get all users
	userdata.find({ confirmed: true }).toArray((err, userDocs) => {
		if(err) {
			callback(new Error('There was a problem querying the users from the database!'), null);
			return;
		}

		// Get user registered count
		stats.registered.total = userDocs.length;

		// Get array of unique gradYears
		var gradYears = [];
		for(let userDoc of userDocs) {
			var gradYear = userDoc.gradYear;

			// If gradYear is null, it's a teacher
			if(gradYear === null) {
				gradYear = 'teacher';
			}

			// If gradYear isn't in the array yet, push to gradYears
			if(!gradYears.includes(gradYear)) {
				gradYears.push(gradYear);
			}
		}

		// First off, set every graduation year to 0 or empty object
		for(let gradYear of gradYears) {
			stats.registered.gradYears[gradYear] = {};
			stats.visitedToday.gradYears[gradYear] = 0;
		}

		// Loop through all the users for when they registered and last time they visited the site
		var today = moment();
		for(let userDoc of userDocs) {
			// If gradYear is null, it's a teacher
			var gradYear = userDoc.gradYear;
			if(gradYear === null) {
				gradYear = 'teacher'
			}

			// Get day user registered
			var registered = moment(userDoc.registered);
			var formatRegistered = registered.format('YYYY-MM-DD');

			// Check if user registered today
			if(today.isSame(registered, 'day')) {
				stats.registered.today++;
			}

			stats.registered.gradYears[gradYear][formatRegistered] = stats.registered.gradYears[gradYear][formatRegistered] + 1 || 1;

			// Check if user visited today
			if(today.isSame(userDoc.lastVisited, 'day')) {
				stats.visitedToday.total++;
				stats.visitedToday.gradYears[gradYear]++;
			}
		}

		callback(null, stats);
	});
}

module.exports.get = getStats;
