'use strict';

/**
 * @file Manages Daily Bulletin API endpoints
 */

var _             = require('underscore');
var dailyBulletin = require(__dirname + '/../libs/dailyBulletin.js');
var users         = require(__dirname + '/../libs/users.js');

module.exports = function(app, db, socketIO) {

	app.post('/daily-bulletin/list', function(req, res) {
		dailyBulletin.getList(function(err, bulletins) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				baseURL: dailyBulletin.baseURL,
				bulletins: bulletins
			});
		});
	});

	app.post('/daily-bulletin/query', function(req, res) {
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

			// Alright, username checks out.
			dailyBulletin.queryLatest(function(err) {
				if(err) {
					var errorMessage = err.message;
				} else {
					var errorMessage = null;
					socketIO.user(req.user.user, 'bulletin', 'query');
				}
				res.json({ error: errorMessage });
			});
		});
	});

	app.post('/daily-bulletin/query-all', function(req, res) {
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
			dailyBulletin.queryAll(function(err) {
				if(err) {
					var errorMessage = err.message;
				} else {
					var errorMessage = null;
					socketIO.user(req.user.user, 'bulletin', 'query');
				}
				res.json({ error: errorMessage });
			});
		});
	});

}
