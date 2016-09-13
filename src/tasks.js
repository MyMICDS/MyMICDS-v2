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
var admins		  = require(__dirname + '/libs/admins.js');
var MongoClient   = require('mongodb').MongoClient;

// Only run these intervals in production so we don't waste our API calls
if(config.production) {

	console.log('Starting tasks server!');

	MongoClient.connect(config.mongodb.uri, function(dbErr, db) {

		var fiveMinuteInterval = later.parse.text('every 5 min');

		/*
		 * Get Daily Bulletin every 5 minutes
		 */

		var updateBulletin = later.setInterval(function() {
			console.log('[' + new Date() + '] Check for latest Daily Bulletin');

			dailyBulletin.queryLatest(function(err) {
				if(err) {
					console.log('[' + new Date() + '] Error occured for Daily Bulletin! (' + err + ')');
					if(!dbErr) {
						admins.sendEmail(db, {
							subject: "Error Notification - Daily Bulletin Retrieval",
							html: "There was an error when retrieving the daily bulletin.<br>Error message: " + err
						}, function(err) {
							console.log('[' + new Date() + '] Error occured when sending admin notifications! (' + err + ')');
						});
					} else {
						console.log('[' + new Date() + '] Error when connecting to database! (' + err + ')');
					}
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
					if(!dbErr) {
						admins.sendEmail(db, {
							subject: "Error Notification - Weather Retrieval",
							html: "There was an error when retrieving the weather.<br>Error message: " + err
						}, function(err) {
							console.log('[' + new Date() + '] Error occured when sending admin notifications! (' + err + ')');
						});
					} else {
						console.log('[' + new Date() + '] Error when connecting to database! (' + err + ')');
					}
				} else {
					console.log('[' + new Date() + '] Successfully updated weather!');
				}
			});

		}, fiveMinuteInterval);
	});
} else {
	console.log('Not starting tasks server because we are not on production.');
}