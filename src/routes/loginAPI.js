'use strict';

/**
 * @file Manages login API endpoints
 */

var auth = require(__dirname + '/../libs/auth.js');

module.exports = function(app, db) {

	app.post('/auth/login', function(req, res) {
		if(req.session.user) {
			res.json({
				error  : 'You\'re already logged in, silly!',
				success: false,
				cookie : null
			});
			return;
		}

		var generateCookie = typeof req.body.remember !== 'undefined';

		auth.login(db, req.body.user, req.body.password, generateCookie, function(err, response, cookie) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			// Set user to req.session.user if successful
			if(response) {
				req.session.user = req.body.user.toLowerCase();
			}

			res.json({
				error  : errorMessage,
				success: response,
				cookie : cookie
			});
		});
	});

	app.post('/auth/logout', function(req, res) {
		// Clear Remember Me cookie and destroy active login session
		res.clearCookie('rememberme');
		req.session.destroy(function(err) {
			if(err) {
				var errorMessage = 'There was a problem logging out!';
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
			gradYear : parseInt(req.body['grad-year'])
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
			res.end(errorMessage);
		});
	});

}
