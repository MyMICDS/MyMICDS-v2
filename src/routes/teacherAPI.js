'use strict';

/**
 * @file Manages class API endpoints
 */

var teachers = require(__dirname + '/../libs/teachers.js');

module.exports = (app, db) => {

	app.post('/teachers/list', (req, res) => {
		teachers.list(db, (err, teachers) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				teachers: teachers
			});
		});
	});

};
