'use strict';

/**
 * @file Manages Daily Bulletin API endpoints
 */
const _ = require('underscore');
const dailyBulletin = require(__dirname + '/../libs/dailyBulletin.js');
const users = require(__dirname + '/../libs/users.js');

module.exports = (app, db, socketIO) => {
	
	app.get('/daily-bulletin/json', (req, res) => {
		
		dailyBulletin.getPDFJSON(req.query.date, function (err, reals, content, info) {
			if (!err) {
				if (req.query.raw == "true") {
					res.json({
						error : null,
						parsedcontent : info,
						actualcontent : reals,
						raw : content
					})
				}
				else {
					res.json({
						error : null,
						parsedcontent : info
					});
				}
			}
			else if (req.query.date == undefined) {
				res.json({
					error : 'you did not give a date (YYYY-MM-DD)'
				})
			}
			else {
				res.json({
					error : err,
					actualcontent : reals,
					raw : content
				});
			}
		});
	});

	app.post('/daily-bulletin/list', (req, res) => {
		dailyBulletin.getList((err, bulletins) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({
				error,
				baseURL: dailyBulletin.baseURL,
				bulletins
			});
		});
	});

	app.post('/daily-bulletin/query', (req, res) => {
		// Check if admin
		users.get(db, req.user.user, (err, isUser, userDoc) => {
			if(err) {
				res.json({ error: err.message });
				return;
			}
			if(!isUser || !_.contains(userDoc.scopes, 'admin')) {
				res.status(401).json({ error: 'You\'re not authorized in this part of the site, punk.' });
				return;
			}

			// Alright, username checks out.
			dailyBulletin.queryLatest(err => {
				let error = null;
				if(err) {
					error = err.message;
				} else {
					socketIO.user(req.user.user, 'bulletin', 'query');
				}
				res.json({ error });
			});
		});
	});

	app.post('/daily-bulletin/query-all', (req, res) => {
		// Check if admin
		users.get(db, req.user.user, (err, isUser, userDoc) => {
			if(err) {
				res.json({ error: err.message });
				return;
			}
			if(!isUser || !_.contains(userDoc.scopes, 'admin')) {
				res.status(401).json({ error: 'You\'re not authorized in this part of the site, punk.' });
				return;
			}

			// Alright, username checks out
			dailyBulletin.queryAll(err => {
				let error = null;
				if(err) {
					error = err.message;
				} else {
					socketIO.user(req.user.user, 'bulletin', 'query');
				}
				res.json({ error });
			});
		});
	});

};
