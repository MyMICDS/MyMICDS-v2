'use strict';

/**
 * @file Manages regularly scheduled tasks (similar to Cron-Jobs)
 */

try {
	var config = require(__dirname + '/libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

var dailyBulletin = require(__dirname + '/libs/dailyBulletin.js');
var later         = require('later');
var weather       = require(__dirname + '/libs/weather.js');

// Only run these intervals in production so we don't waste our API calls
if(config.production) {

	console.log('Starting tasks server!');

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

} else {
	console.log('Not starting tasks server because we are not on production.');
}
