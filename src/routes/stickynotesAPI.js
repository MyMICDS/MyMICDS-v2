/**
 * @file Manages stickynotes API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const stickynotes = require(__dirname + '/../libs/stickynotes.js');

module.exports = (app, db) => {
	app.get('/stickynotes', (req, res) => {
		stickynotes.get(db, req.body.moduleId, (err, note) => {
			api.respond(res, err, { stickynote: note });
		});
	});

	app.put('/stickynotes', (req, res) => {
		stickynotes.post(db, req.body.text, req.body.moduleId, (err) => {
			api.respond(res, err);
		});
	});
};
