'use strict';

/**
 * @file Manages stats API endpoints
 */
const stats = require(__dirname + "/../libs/stats.js");

module.exports = (app, db) => {

	app.post('/stats/get', (req, res) => {
		stats.get(db, (err, statsObj) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}

			res.json({ error: errorMessage, stats: statsObj });
		});
	});

};