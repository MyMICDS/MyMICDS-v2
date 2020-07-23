import { ChangeUserInfoParameters } from '@mymicds/sdk';
import * as api from '../libs/api';
import * as jwt from '../libs/jwt';
import * as users from '../libs/users';
import RoutesFunction from './routesFunction';

export default ((app, db, socketIO) => {
	app.get('/user/grad-year-to-grade', (req, res) => {
		const grade = users.gradYearToGrade(parseInt(req.query.year, 10));
		api.success(res, { grade });
	});

	app.get('/user/grade-to-grad-year', (req, res) => {
		const gradYear = users.gradeToGradYear(parseInt(req.query.grade, 10));
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
			const userInfo = await users.getInfo(db, req.apiUser!, true);
			api.success(res, userInfo);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.patch('/user/info', jwt.requireLoggedIn, async (req, res) => {
		// All the validation is being done manually to add defaults
		// No reason to add an assertType

		const info: ChangeUserInfoParameters = {};

		if (typeof req.body.firstName === 'string' && req.body.firstName !== '') {
			info.firstName = req.body.firstName;
		}
		if (typeof req.body.lastName === 'string' && req.body.lastName !== '') {
			info.lastName = req.body.lastName;
		}

		if (typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			info.gradYear = null;
		} else {
			info.gradYear = parseInt(req.body.gradYear, 10);
		}

		try {
			await users.changeInfo(db, req.apiUser!, info);
			const newInfo = await users.getInfo(db, req.apiUser!, true);
			socketIO.user(req.apiUser!, 'user', 'change-info', newInfo);
			api.success(res, newInfo);
		} catch (err) {
			api.error(res, err);
		}
	});
}) as RoutesFunction;
