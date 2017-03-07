'use strict';

/**
 * @file Manages user API endpoints
 */

var dates = require(__dirname + '/../libs/dates.js');

module.exports = function(app, db, socketIO) {

	app.post('/dates/school-ends', function(req, res) {
		res.json({ date: dates.schoolEnds() });
	});

}
