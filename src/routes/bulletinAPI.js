'use strict';

/**
 * @file Manages Daily Bulletin API endpoints
 */

var dailyBulletin = require(__dirname + '/../libs/dailyBulletin.js');

module.exports = function(app, db) {

	app.post('/daily-bulletin/query', function(req, res) {
		dailyBulletin.queryLatest(function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/daily-bulletin/query-all', function(req, res) {
		dailyBulletin.queryAll(function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
