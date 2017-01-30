var mailer = require(__dirname + "/../libs/mail.js");
var admins = require(__dirname + "/../libs/admins.js");

module.exports = function (app, db) {
        // handle POST request
        console.log("online");
        app.post('/suggestion/post', function(req, res) {
                // handle function
                // params: type, text
                admins.sendEmail(db, {
			subject: 'Suggestion From: ' + req.user.user,
			html: '<h3 style="color:lightblue">Suggestion From ' + req.user.user + "</h1>\n" + "Type: " + req.body.type + "\n" + "Submission: " + req.body.submission
		}, function(err) {
			if(err) {
				console.log("Couldn't send admins about a suggestion!");
				return;
			}
		});
                res.end("Done");
        });
}
