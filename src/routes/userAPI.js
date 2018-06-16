/**
 * @file Manages user API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const users = require(__dirname + '/../libs/users.js');

module.exports = (app, db, socketIO) => {

	app.get('/user/grad-year-to-grade', (req, res) => {
		const grade = users.gradYearToGrade(parseInt(req.query.year));
		api.success(res, { grade });
	});

	app.get('/user/grade-to-grad-year', (req, res) => {
		const gradYear = users.gradeToGradYear(parseInt(req.query.grade));
		api.success(res, { year: gradYear });
	});

	app.get('/user/grade-range', (req, res) => {
		const gradYears = [];
		// Set min (inclusive) and max (inclusive)
		const min = -1; // JK
		const max = 12; // Senior
		for (let i = min; i <= max; i++) {
			gradYears.push(users.gradeToGradYear(i));
		}
		// Put most recent years first
		gradYears.reverse();
		api.success(res, { gradYears });
	});

	app.get('/user/info', jwt.requireLoggedIn, async (req, res) => {
		try {
			const userInfo = await users.getInfo(db, req.apiUser, true);
			api.success(res, { user: userInfo });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.patch('/user/info', jwt.requireLoggedIn, async (req, res) => {
		const info = {};

		if (typeof req.body.firstName === 'string' && req.body.firstName !== '') {
			info.firstName = req.body.firstName;
		}
		if (typeof req.body.lastName === 'string' && req.body.lastName !== '') {
			info.lastName = req.body.lastName;
		}

		if (typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			info.gradYear = null;
		} else {
			info.gradYear = parseInt(req.body.gradYear);
		}

		try {
			await users.changeInfo(db, req.apiUser, info);
			socketIO.user(req.apiUser, 'user', 'change-info', info);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};
