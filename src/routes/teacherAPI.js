'use strict';

/**
 * @file Manages class API endpoints
 */
const teachers = require(__dirname + '/../libs/teachers.js');

module.exports = (app, db) => {

	app.post('/teachers/list', (req, res) => {
		teachers.list(db, (err, teachers) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				teachers: teachers
			});
		});
	});

};
