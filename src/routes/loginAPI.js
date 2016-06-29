/**
 * @file Manages login API endpoints
 */

var config = require(__dirname + '/../libs/config.js');

var auth        = require(__dirname + '/../libs/auth.js');
var MongoClient = require('mongodb').MongoClient;

module.exports = function(app) {

	app.post('/login', function(req, res) {
		if(req.session.user) {
			res.json({
				error  : 'You\'re already logged in, silly!',
				success: false,
				cookie : null
			});
			return;
		}

		MongoClient.connect(config.mongodbURI, function(err, db) {
			if(err) {
				db.close();
				res.json({
					error  : 'There was a problem connecting to the database!',
					success: null,
					cookie : null
				});
				return;
			}

	        auth.login(db, req.body.user, req.body.password, function(err, response, cookie) {
				db.close();
	            if(err) {
	                var errorMessage = err.message;
	            } else {
	                var errorMessage = null;
	            }

	            res.json({
	                error  : errorMessage,
	                success: response,
	                cookie : cookie
	            });
	        });
		});
	});

    app.post('/logout', function(req, res) {
        // Clear Remember Me cookie and destroy active login session
        res.clearCookie('rememberme');
        req.session.destroy(function(err) {
			if(err) {
                res.json({success: false, message: 'There was an error logging out.'});
				return;
            }

			res.json({success: true, message: 'Logged out!'});

		});
    });

    app.post('/register', function(req, res) {

		var user = {
			user     : req.body.user,
			password : req.body.password,
			firstName: req.body.firstName,
			lastName : req.body.lastName,
			gradYear : req.body.gradYear,
            teacher  : (req.body.teacher !== undefined),
		};

		MongoClient.connect(config.mongodbURI, function(err) {
			if(err) {
				db.close();
				res.json({
					error:
				});
			}
	        auth.register(db, user, function(err) {
				db.close();
				if(err) {
					var errorMessage = err.message;
				} else {
					var errorMessage = null;
				}
	            res.json({ error: errorMessage });
			});
		});
    });

	/**
	 * @TODO: Display errors, redirect, etc.
	 */

    app.get('/confirm/:user/:hash', function(req, res) {
		MongoClient.connect(config.mongodbURI, function(err) {
			if(err) {
				db.close();
				res.end('There was a problem connecting to the database!');
			}

	        auth.confirm(db, req.params.user, req.params.hash, function(err) {
				db.close();
	            if(err) {
	                var response = err.message;
	            } else {
	                var response = 'Success!';
	            }
	            res.end(response);
	        });
		});
    });

}
