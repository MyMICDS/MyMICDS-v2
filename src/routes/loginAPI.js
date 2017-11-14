/**
 * @file Manages login API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const auth = require(__dirname + '/../libs/auth.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const passwords = require(__dirname + '/../libs/passwords.js');

module.exports = (app, db) => {

	app.post('/auth/login', (req, res) => {
		if(req.user) {
			api.respond(res, null, {
				success: true,
				message: 'You\'re already logged in, silly!',
				jwt    : null
			});
			return;
		}

		const rememberMe = typeof req.body.remember !== 'undefined';

		auth.login(db, req.body.user, req.body.password, rememberMe, req.body.comment, (err, success, message, jwt) => {
			api.respond(res, err, { success, message, jwt });
		});
	});

	app.post('/auth/logout', (req, res) => {
		let token = req.get('Authorization');
		// If there's a token, we need to get rid of the 'Bearer ' at the beginning
		if(token) {
			token = token.slice(7);
		}

		jwt.revoke(db, req.user, token, err => {
			api.respond(res, err);
		});
	});

	app.post('/auth/register', (req, res) => {

		const user = {
			user: req.body.user,
			password: req.body.password,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			gradYear: parseInt(req.body.gradYear)
		};

		if(typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			user.gradYear = null;
		}

		auth.register(db, user, err => {
			api.respond(res, err);
		});
	});

	app.post('/auth/confirm', (req, res) => {
		auth.confirm(db, req.body.user, req.body.hash, err => {
			api.respond(res, err);
		});
	});

	app.put('/auth/change-password', jwt.requireLoggedIn, (req, res) => {
		passwords.changePassword(db, req.apiUser, req.body.oldPassword, req.body.newPassword, err => {
			api.respond(res, err);
		});
	});

	app.post('/auth/forgot-password', (req, res) => {
		if(req.apiUser) {
			api.respond(res, 'You are already logged in, silly!');
			return;
		}
		passwords.resetPasswordEmail(db, req.body.user, err => {
			api.respond(res, err);
		});
	});

	app.put('/auth/reset-password', (req, res) => {
		if(req.apiUser) {
			api.respond(res, 'You are already logged in, silly!');
			return;
		}
		passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash, err => {
			api.respond(res, err);
		});
	});

};
