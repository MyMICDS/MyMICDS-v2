/**
 * @file Manages teachers API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const teachers = require(__dirname + '/../libs/teachers.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app, db) => {

	app.get('/teachers', jwt.requireLoggedIn, (req, res) => {
		teachers.list(db, (err, teachers) => {
			api.respond(res, err, { teachers });
		});
	});

};
