/**
 * @file Manages login API endpoints
 */

var auth    = require(__dirname + '/../libs/auth.js');
var cookies = require(__dirname + '/../libs/cookies.js');

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
        auth.login(req.body.user, req.body.password, function(err, response, cookie) {
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

    app.post('/logout', function(req, res) {
        // Clear Remember Me cookie and destroy active login session
        res.clearCookie('rememberme');
        req.session.destroy(function(err) {
			if(!err) {
				res.json({success: true, message: 'Logged out!'});
			} else {
                res.json({success: false, message: 'There was an error logging out.'});
            }
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

        auth.register(user, function(success, message) {
            res.json({success: success, message: message});
		});

    });

    app.get('/confirm/:user/:hash', function(req, res) {
        auth.confirm(req.params.user, req.params.hash, function(err) {
            if(err) {
                var response = err.message;
            } else {
                var response = 'Success!';
            }
            res.end(response);
        });
    });

}
