/**
 * @file Manages login POST requests.
 * @module login
 */

var auth = require(__dirname + '/../libs/auth.js');

module.exports = function(app) {
	app.post('/login', function(req, res) {
		
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
            // TODO: Implement some kind of error notification
        }
    });
    
    app.post('/register', function(req, res) {
        var registerResponse = auth.register();
    });
}