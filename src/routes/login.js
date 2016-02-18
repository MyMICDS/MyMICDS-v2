/**
 * @file Manages login POST requests
 */

var auth = require(__dirname + '/../libs/auth.js');

module.exports = function(app) {
	app.post('/login', function(req, res) {
		
		console.log(req.body);
		
        var user = req.body.user;
        var password = req.body.password;
        
        auth.login(req.body, user, password, function(response) {
			
			if(response === true) {
				var success = true;
				var responseMessage = "Success!";
			} else {
				var success = false;
				var responseMessage = response;
			}
			
			var responseJSON =
			{
				success: success,
				message: responseMessage,
			};
			
			console.log(responseJSON);
			res.json(responseJSON);
		});
		
	});
    
    app.post('/logout', function(req, res) {
        req.session.destroy(function(err) {
			if(err) {
				/** @todo Implement some kind of error notification */
			}
		});
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
		
        auth.register(user, function(response) {
			if(response === true) {
				/** @todo Send confirmation email */
			} else {
				/** @todo Implement some kind of error notification */
			}
		});
		
    });
}
