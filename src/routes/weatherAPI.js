'use strict';

/**
 * @file Manages weather API endpoints
 */
const _ = require('underscore');
const users = require(__dirname + '/../libs/users.js');
const weather = require(__dirname + '/../libs/weather.js');

module.exports = (app, db, socketIO) => {

	app.post('/weather/get', (req, res) => {
		weather.get((err, weatherJSON) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({
				error,
				weather: weatherJSON
			});
		});
	});

	app.post('/weather/update', (req, res) => {
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
			weather.update((err, weatherJSON) => {
				let error = null;
				if(err) {
					error = err.message;
				} else {
					socketIO.global('weather', weatherJSON);
				}
				res.json({ error });
			});
		});
	});

};
