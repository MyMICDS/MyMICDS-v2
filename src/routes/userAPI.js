'use strict';

/**
 * @file Manages user API endpoints
 */

var users = require(__dirname + '/../libs/users.js');

module.exports = function(app, db) {

	app.post('/user/grad-year-to-grade', function(req, res) {
		var grade = users.gradYearToGrade(parseInt(req.body.year));
		res.json({ grade: grade });
	});

	app.post('/user/grade-to-grad-year', function(req, res) {
		var gradYear = users.gradeToGradYear(parseInt(req.body.grade));
		res.json({ year: gradYear });
	});

	app.post('/user/school-ends', function(req, res) {
		var ends = users.schoolEnds();
		res.json({ ends: ends });
	});

	app.post('/user/grade-range', function(req, res) {
		var gradYears = [];
		// Set min (inclusive) and max (inclusive)
		var min = -1; // JK
		var max = 12; // Senior
		for(var i = min; i <= max; i++) {
			gradYears.push(users.gradeToGradYear(i));
		}
		// Put most recent years first
		gradYears.reverse();
		res.json({ gradYears });
	});

	app.post('/user/get-info', function(req, res) {
		users.getInfo(db, req.user.user, true, function(err, userInfo) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				user: userInfo
			});
		});
	});

	app.post('/user/change-info', function(req, res) {
		var info = {};

		if(typeof req.body.firstName === 'string' && req.body.firstName !== '') {
			info.firstName = req.body.firstName;
		}
		if(typeof req.body.lastName === 'string' && req.body.lastName !== '') {
			info.lastName = req.body.lastName;
		}

		if(typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			info.gradYear = null;
		} else {
			info.gradYear = parseInt(req.body.gradYear);
		}

		users.changeInfo(db, req.user.user, info, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
