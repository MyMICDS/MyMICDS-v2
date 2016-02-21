/**
 * @file Manages login POST requests
 */

var auth = require(__dirname + '/../libs/auth.js');

module.exports = function(app) {
    
    app.get('/confirm/:user/:hash', function(req, res) {
        auth.confirm(req.params.user, req.params.hash, function(response) {
            res.end(response.toString());
        });     
    });
    
	app.post('/login', function(req, res) {
		
        var user = req.body.user;
        var password = req.body.password;
        
        auth.login(user, password, function(response) {
			
            console.log('reponse: ' + response);
            
			if(response === true) {
				var success = true;
				var responseMessage = 'Success!';
                
                req.session.user = user.toLowerCase();
			} else {
                var success = false;
                
                if(response === false) {
                    var responseMessage = 'Invalid password!';
                } else {
                    var responseMessage = response;
                }
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
				user      : req.body.user,
				password  : req.body.password,
				firstName : req.body.firstName,
				lastName  : req.body.lastName,
				gradYear  : req.body.gradYear,
			};
		
        auth.register(user, function(response) {
            console.log(response);
			if(response === true) {
				/** @todo Send confirmation email */
			} else {
				/** @todo Implement some kind of error notification */
			}
		});
		
    });
}
