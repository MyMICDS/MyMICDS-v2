/**
 * @file Manages suggestion API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const admins = require(__dirname + '/../libs/admins.js');

module.exports = (app, db) => {
	app.post('/suggestion', (req, res) => {
		admins.sendEmail(db, {
			subject: 'Suggestion From: ' + req.apiUser,
			html: 'Suggestion From ' + req.apiUser + '\n' + 'Type: ' + req.body.type + '\n' + 'Submission: ' + req.body.submission
		}, err => {
			api.respond(res, err);
		});
	});
};
