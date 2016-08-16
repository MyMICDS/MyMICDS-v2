'use strict';

/**
 * @file Regularly scheduled functions. Sorta like Cron Jobs but for node.js
 * @module tasks
 */

var config        = require(__dirname + '/config.js');
var dailyBulletin = require(__dirname + '/dailyBulletin.js');
var later         = require('later');
var weather       = require(__dirname + '/weather.js');

module.exports = function() {
	// Only run these intervals in production so we don't waste our API calls
	if(config.production) {

		var fiveMinuteInterval = later.parse.text('every 5 min');

		/*
		 * Get Daily Bulletin every 5 minutes
		 */

		var updateBulletin = later.setInterval(function() {
			console.log('[' + new Date() + '] Check for latest Daily Bulletin');

			dailyBulletin.queryLatest(function(err) {
				if(err) {
					console.log('[' + new Date() + '] Error occured for Daily Bulletin! (' + err + ')');
					/** @TODO Send an email if something isn't working */
				} else {
					console.log('[' + new Date() + '] Successfully got latest Daily Bulletin!');
				}
			});

		}, fiveMinuteInterval);

		/*
		 * Get new weather info every 5 minutes
		 */

		var updateWeather = later.setInterval(function() {
			console.log('[' + new Date() + '] Update Weather');

			weather.update(function(err, weatherJSON) {
				if(err) {
					console.log('[' + new Date() + '] Error occured for weather! (' + err + ')');
					/** @TODO Send an email if something isn't working */
				} else {
					console.log('[' + new Date() + '] Successfully updated weather!');
				}
			});

		}, fiveMinuteInterval);

	}
}
