'use strict';

/**
 * @file Manages weather API endpoints
 */

var _       = require('underscore');
var users   = require(__dirname + '/../libs/users.js');
var weather = require(__dirname + '/../libs/weather.js');

module.exports = function(app, db) {

	app.post('/weather/get', function(req, res) {
		weather.get(function(err, weatherJSON) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				weather: weatherJSON
			});
		});
	});

	app.post('/weather/update', function(req, res) {
		// Check if admin
		users.get(db, req.user.user, function(err, isUser, userDoc) {
			if(err) {
				res.json({ error: err.message });
				return;
			}
			if(!isUser || !_.contains(userDoc.scopes, 'admin')) {
				res.status(401).json({ error: 'You\'re not authorized in this part of the site, punk.' });
				return;
			}

			// Alright, username checks out
			weather.update(function(err, weatherJSON) {
				if(err) {
					var errorMessage = err.message;
				} else {
					var errorMessage = null;
				}
				res.json({ error: errorMessage });
			});
		});
	});

}
