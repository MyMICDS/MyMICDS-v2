'use strict';

/**
 * @file Manages login API endpoints
 */

var auth      = require(__dirname + '/../libs/auth.js');
var jwt       = require(__dirname + '/../libs/jwt.js');
var passwords = require(__dirname + '/../libs/passwords.js');

module.exports = function(app, db) {

	app.post('/auth/login', function(req, res) {
		if(req.user) {
			res.json({
				error  : null,
				success: false,
				message: 'You\'re already logged in, silly!',
				jwt    : null
			});
			return;
		}

		var rememberMe = typeof req.body.remember !== 'undefined';

		auth.login(db, req.body.user, req.body.password, rememberMe, function(err, response, message, jwt) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error  : errorMessage,
				success: response,
				message: message,
				jwt    : jwt
			});
		});
	});

	app.post('/auth/logout', function(req, res) {
		var token = req.get('Authorization');
		// If there's a token, we need to get rid of the 'Bearer ' at the beginning
		if(token) {
			token = token.slice(7);
		}

		jwt.revoke(db, req.user, token, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/auth/register', function(req, res) {

		var user = {
			user     : req.body.user,
			password : req.body.password,
			firstName: req.body.firstName,
			lastName : req.body.lastName,
			gradYear : parseInt(req.body.gradYear)
		};

		if(typeof req.body.teacher !== 'undefined' && req.body.teacher !== false) {
			user.gradYear = null;
		}

		auth.register(db, user, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/auth/confirm', function(req, res) {
		auth.confirm(db, req.body.user, req.body.hash, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/auth/change-password', function(req, res) {
		passwords.changePassword(db, req.user.user, req.body.oldPassword, req.body.newPassword, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/auth/forgot-password', function(req, res) {
		if(req.user.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPasswordEmail(db, req.body.user, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/auth/reset-password', function(req, res) {
		if(req.user.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
