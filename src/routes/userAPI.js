'use strict';

/**
 * @file Manages user API endpoints
 */
const users = require(__dirname + '/../libs/users.js');

module.exports = (app, db, socketIO) => {

	app.post('/user/grad-year-to-grade', (req, res) => {
		const grade = users.gradYearToGrade(parseInt(req.body.year));
		res.json({ grade: grade });
	});

	app.post('/user/grade-to-grad-year', (req, res) => {
		const gradYear = users.gradeToGradYear(parseInt(req.body.grade));
		res.json({ year: gradYear });
	});

	app.post('/user/grade-range', (req, res) => {
		const gradYears = [];
		// Set min (inclusive) and max (inclusive)
		const min = -1; // JK
		const max = 12; // Senior
		for(let i = min; i <= max; i++) {
			gradYears.push(users.gradeToGradYear(i));
		}
		// Put most recent years first
		gradYears.reverse();
		res.json({ gradYears });
	});

	app.post('/user/get-info', (req, res) => {
		users.getInfo(db, req.user.user, true, (err, userInfo) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				user: userInfo
			});
		});
	});

	app.post('/user/change-info', (req, res) => {
		const info = {};

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

		users.changeInfo(db, req.user.user, info, err => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
				socketIO.user(req.user.user, 'user', 'change-info', info);
			}
			res.json({ error: errorMessage });
		});
	});

};
