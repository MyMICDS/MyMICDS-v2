const stickynotes = require(__dirname + '/../libs/stickynotes.js');

module.exports = (app, db) => {

	app.post('/stickynotes/get', (req, res) => {
		stickynotes.get(db, req.user.user, req.body.moduleId, (err, note) => {
			res.json({
				error: err ? err.message : null,
				stickynote: note
			});
		});
	});

	app.post('/stickynotes/post', (req, res) => {
		stickynotes.post(db, req.user.user, req.body.moduleId, req.body.text, (err) => {
			res.json({
				error: err ? err.message : null
			});
		});
	});

};
