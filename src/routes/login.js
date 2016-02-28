/**
 * @file Manages login POST requests
 */

var auth    = require(__dirname + '/../libs/auth.js');
var cookies = require(__dirname + '/../libs/cookies.js');

module.exports = function(app) {
    
    app.get('/confirm/:user/:hash', function(req, res) {
        auth.confirm(req.params.user, req.params.hash, function(response) {
            res.end(response.toString());
        });     
    });
    
	app.post('/login', function(req, res) {
		
        var user = req.body.user.toLowerCase();
        var password = req.body.password;
        var remember = (req.body.remember !== undefined);
        
        var responseJSON =
        {
			success : '',
			message : '',
			selector: false,
			token   : false,
			expires : null,
        };
        
        if(user && password) {
            auth.login(user, password, function(response) {

                if(response === true) {
                    responseJSON.success = true;
                    responseJSON.message = 'Success!';

                    req.session.user = user;

                    // If 'Remember Me' is checked, generate cookie

                    if(remember) {
                        cookies.createCookie(user, function(selector, token, expires) {

                            if(token && selector && expires) {
                                responseJSON.selector = selector;
                                responseJSON.token    = token;
								responseJSON.expires  = expires.toUTCString();
                            }
                            res.json(responseJSON);
                        });
                    } else {
                        res.json(responseJSON);
                    }
                } else {

                    // Login Failed

                    responseJSON.success = false;

                    if(response === false) {
                        responseJSON.message = 'Invalid password!';
                    } else {
                        responseJSON.message = response;
                    }

                    res.json(responseJSON);
                }
            });
        } else {
            responseJSON.success = false;
            
            if(!password) {
                responseJSON.message = 'Invalid password!';
            }
            
            if(!user) {
                responseJSON.message = 'Username doesn\'t exist!';
            }
            
            res.json(responseJSON);
        }
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
        
		var user =
			{
				user     : req.body.user,
				password : req.body.password,
				firstName: req.body.firstName,
				lastName : req.body.lastName,
				gradYear : req.body.gradYear,
			};
		
        auth.register(user, function(response) {
            
			if(response === true) {
                res.json({success: true, message: 'Message sent to ' + user + '@micds.org!'});
			} else {
                res.json({succes: false, message: response});
			}
		});
		
    });
}
