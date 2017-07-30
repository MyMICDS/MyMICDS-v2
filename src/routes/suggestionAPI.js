/**
 * @file Manages suggestion API endpoints
 */
const admins = require(__dirname + '/../libs/admins.js');

module.exports = (app, db) => {
	app.post('/suggestion/send', (req, res) => {
		admins.sendEmail(db, {
			subject: 'Suggestion From: ' + req.user.user,
			html: 'Suggestion From ' + req.user.user + '\n' + 'Type: ' + req.body.type + '\n' + 'Submission: ' + req.body.submission
		}, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});
};
