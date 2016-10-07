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
 * @param {Object} statistics - Object containing statistics if success, null if failure.
 */

function getStats(db, callback) {
	var userdata = db.collection('users');

	userdata.count(function(err, userCount) {
		if(err) {
			callback(new Error('There was an error counting the registered users!'), null);
			return;
		}

		userdata.distinct('gradYear', function(err, gradYears) {
			if(err) {
				callback(new Error('There was an error getting the user graduation years!'), null);
				return;
			}

			var yearDates = {};

			gradYears.forEach(function(year) {
				yearDates[year] = {};

				userdata.find({gradYear: year}).toArray(function(err, userDocs) {
					if(err) {
						callback(new Error('There was an error getting the user register dates!'), null);
						return;
					}

					userDocs.forEach(function(userDoc) {
						var registerDay = moment(userDoc['registered']).format('YYYY-MM-DD');

						if(Object.keys(yearDates[year]).includes(registerDay)) {
							yearDates[year][registerDay]++;
						} else {
							yearDates[year][registerDay] = 1;
						}
					});

					userdata.find({lastVisited: {$gte: moment().startOf('day').toDate()}}).count(function(err, visitCount) {
						if(err) {
							callback(new Error('There was an error finding the recently active users!'), null);
							return;
						}

						userdata.find({registered: {$gte: moment().startOf('day').toDate()}}).count(function(err, registerCount) {
							if(err) {
								callback(new Error('There was an error finding the recently registered users!'), null);
								return;
							}
						
							var statistics = {
								registered: {
									total: userCount,
									today: registerCount,
									gradYears: yearDates
								},
								visitedToday: visitCount
							};

							callback(null, statistics);
						});
					});
				});
			});
		});
	});
}

module.exports.get = getStats;