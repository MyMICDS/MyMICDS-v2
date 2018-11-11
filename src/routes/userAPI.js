/**
 * @file Manages user API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const users = require(__dirname + '/../libs/users.js');

module.exports = (app, db, socketIO) => {

	app.get('/user/grad-year-to-grade', (req, res) => {
		const grade = users.gradYearToGrade(parseInt(req.query.year));
		api.respond(res, null, { grade });
	});

	app.get('/user/grade-to-grad-year', (req, res) => {
		const gradYear = users.gradeToGradYear(parseInt(req.query.grade));
		api.respond(res, null, { year: gradYear });
	});

	app.get('/user/grade-range', (req, res) => {
		const gradYears = [];
		// Set min (inclusive) and max (inclusive)
		const min = -1; // JK
		const max = 12; // Senior
		for(let i = min; i <= max; i++) {
			gradYears.push(users.gradeToGradYear(i));
		}
		// Put most recent years first
		gradYears.reverse();
		api.respond(res, null, { gradYears });
	});

	app.get('/user/info', jwt.requireLoggedIn, (req, res) => {
		users.getInfo(db, req.apiUser, true, (err, userInfo) => {
			api.respond(res, err, userInfo);
		});
	});

	app.patch('/user/info', jwt.requireLoggedIn, (req, res) => {
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

		users.changeInfo(db, req.apiUser, info, err => {
			if(!err) {
				socketIO.user(req.apiUser, 'user', 'change-info', info);
			}
			api.respond(res, err);
		});
	});

};
