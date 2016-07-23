'use strict';

/**
 * @file Manages login API endpoints
 */

var auth = require(__dirname + '/../libs/auth.js');
var jwt  = require(__dirname + '/../libs/jwt.js');

module.exports = function(app, db) {

	app.post('/auth/login', function(req, res) {
		if(req.user) {
			res.json({
				error  : 'You\'re already logged in, silly!',
				success: false,
				jwt    : null
			});
			return;
		}

		var rememberMe = typeof req.body.remember !== 'undefined';

		auth.login(db, req.body.user, req.body.password, rememberMe, function(err, response, jwt) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error  : errorMessage,
				success: response,
				jwt    : jwt
			});
		});
	});

	app.post('/auth/logout', function(req, res) {
		var revokeJWT = req.get('Authorization').slice(7);
		jwt.revoke(db, req.user, revokeJWT, function(err) {
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
