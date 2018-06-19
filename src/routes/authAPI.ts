/**
 * @file Manages login API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const auth = require(__dirname + '/../libs/auth.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const passwords = require(__dirname + '/../libs/passwords.js');

module.exports = (app, db) => {

	app.post('/auth/login', async (req, res) => {
		if (req.user) {
			api.success(res, {
				success: true,
				message: 'You\'re already logged in, silly!',
				jwt    : null
			});
			return;
		}

		const rememberMe = typeof req.body.remember !== 'undefined';

		try {
			const responseObj = await auth.login(db, req.body.user, req.body.password, rememberMe, req.body.comment);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/logout', async (req, res) => {
		let token = req.get('Authorization');
		// If there's a token, we need to get rid of the 'Bearer ' at the beginning
		if (token) {
			token = token.slice(7);
		}

		try {
			await jwt.revoke(db, req.user, token);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/register', async (req, res) => {
		const user = {
			user: req.body.user,
			password: req.body.password,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			gradYear: parseInt(req.body.gradYear)
		};

		if (typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			user.gradYear = null;
		}

		try {
			await auth.register(db, user);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/confirm', async (req, res) => {
		try {
			await auth.confirm(db, req.body.user, req.body.hash);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/auth/change-password', jwt.requireLoggedIn, async (req, res) => {
		try {
			await passwords.changePassword(db, req.apiUser, req.body.oldPassword, req.body.newPassword);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/auth/forgot-password', async (req, res) => {
		if (req.apiUser) {
			api.error(res, 'You are already logged in, silly!');
			return;
		}
		try {
			await passwords.resetPasswordEmail(db, req.body.user);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/auth/reset-password', async (req, res) => {
		if (req.apiUser) {
			api.error(res, 'You are already logged in, silly!');
			return;
		}
		try {
			await passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/auth/verify', (req, res) => {
		if (!req.user.user) {
			api.error(res, 'JWT not provided!');
			return;
		}
		api.success(res, {
			payload: req.user
		});
	});

};
