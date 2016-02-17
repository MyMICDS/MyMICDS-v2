/**
 * @file Manages login POST requests
 */

var auth = require(__dirname + '/../libs/auth.js');

module.exports = function(app) {
	app.post('/login', function(req, res) {
		
		console.log(req.body);
		
        var user = req.body.user;
        var password = req.body.password;
        
        var loginResponse = auth.login(req.session, user, password);
        
        if(loginResponse === true) {
            var success = true;
            var responseMessage = "Success!";
        } else {
            var success = false;
            var responseMessage = loginResponse;
        }
		
        var responseJSON =
        {
			success: success,
			message: loginResponse,
		};
        
        console.log(responseJSON);
		res.json(responseJSON);
		
	});
    
    app.post('/logout', function(req, res) {
        var logoutResponse = auth.logout(req.session);
        if(!logoutResponse) {
            /** @todo Implement some kind of error notification */
        }
    });
    
    app.post('/register', function(req, res) {
		var user =
			{
				user      : req.body.user,
				password  : req.body.password,
				firstName : req.body.firstName,
				lastName  : req.body.lastname,
				gradYear  : req.body.gradYear,
			};
		
        var registerResponse = auth.register(user);
		
		if(registerResponse) {
			/** @todo Login successful notification */
		} else {
			/** @todo Login failed notification */
		}
    });
}
