const stickynotes = require(__dirname + '/../libs/stickynotes.js')

module.exports = (app, db) => {
	app.post('/stickynotes/get', (req, res) => {
		stickynotes.get(db, req.body.moduleId, (err, note) => {
			res.json({
				error: err ? err.message : null,
				stickynote: note
			});
		});
	});

	app.post('/stickynotes/post', (req, res) => {
		stickynotes.post(db, req.body.text, req.body.moduleId, (err) => {
			res.json({
				error: err ? err.message : null,
				success: err ? false : true
			});
		});
	});
}