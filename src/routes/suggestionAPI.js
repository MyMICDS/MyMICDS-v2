var admins = require(__dirname + "/../libs/admins.js");

module.exports = function (app, db) {
        // handle POST request
        app.post('/suggestion/', function(req, res) {
                // handle function
                // params: type, text
                admins.sendEmail(db, {
			subject: 'Suggestion From: ' + req.user.user,
			html: 'Suggestion From ' + req.user.user + "\n" + "Type: " + req.body.type + "\n" + "Submission: " + req.body.submission
		}, function(err) {
			if(err) {
				return;
			}
		});
        });
}
