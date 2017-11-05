/**
 * @file Manages login API endpoints
 */
const auth = require(__dirname + '/../libs/auth.js');
const jwt = require(__dirname + '/../libs/jwt.js');
const passwords = require(__dirname + '/../libs/passwords.js');

module.exports = (app, db) => {

	app.post('/auth/login', (req, res) => {
		if(req.user) {
			res.json({
				error  : null,
				success: false,
				message: 'You\'re already logged in, silly!',
				jwt    : null
			});
			return;
		}

		const rememberMe = typeof req.body.remember !== 'undefined';

		auth.login(db, req.body.user, req.body.password, req.body.comment, rememberMe, (err, response, message, jwt) => {
			let error;
			if(err) {
				error = err.message;
			} else {
				error = null;
			}

			res.json({
				error,
				success: response,
				message,
				jwt
			});
		});
	});

	app.post('/auth/logout', (req, res) => {
		let token = req.get('Authorization');
		// If there's a token, we need to get rid of the 'Bearer ' at the beginning
		if(token) {
			token = token.slice(7);
		}

		jwt.revoke(db, req.user, token, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
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
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/auth/confirm', (req, res) => {
		auth.confirm(db, req.body.user, req.body.hash, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/auth/change-password', (req, res) => {
		passwords.changePassword(db, req.user.user, req.body.oldPassword, req.body.newPassword, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/auth/forgot-password', (req, res) => {
		if(req.user.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPasswordEmail(db, req.body.user, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

	app.post('/auth/reset-password', (req, res) => {
		if(req.user.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

};
