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
			console.log('query latest bulletin');

			dailyBulletin.queryLatest(function(err) {
				console.log('bulletin err', err);
				if(err) {
					/** @TODO Send an email if something isn't working */
				}
			});

		}, fiveMinuteInterval);

		/*
		 * Get new weather info every 5 minutes
		 */

		var updateWeather = later.setInterval(function() {
			console.log('update wehater')

			weather.update(function(err, weatherJSON) {
				console.log('weather err', err);
				if(err) {
					/** @TODO Send an email if something isn't working */
				}
			});

		}, fiveMinuteInterval);

	}
}
