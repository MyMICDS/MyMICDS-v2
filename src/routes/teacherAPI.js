'use strict';

/**
 * @file Manages class API endpoints
 */

var teachers = require(__dirname + '/../libs/teachers.js');

module.exports = function(app, db) {

	app.post('/teachers/list', function(req, res) {
		teachers.list(db, function(err, teachers) {
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
