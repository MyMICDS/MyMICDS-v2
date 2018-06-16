/**
 * @file Manages stickynotes API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const stickynotes = require(__dirname + '/../libs/stickynotes.js');

module.exports = (app, db) => {

	app.get('/stickynotes', async (req, res) => {
		try {
			const note = await stickynotes.get(db, req.user.user, req.body.moduleId);
			api.success(res, { stickynote: note });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/stickynotes', async (req, res) => {
		try {
			await stickynotes.post(db, req.user.user, req.body.moduleId, req.body.text);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};
