/**
 * @file Manages Background API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = (app, db, socketIO) => {

	app.get('/background', async (req, res) => {
		try {
			const responseObj = await backgrounds.get(req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.get('/background/all', async (req, res) => {
		try {
			const responseObj = await backgrounds.getAll(db);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.put('/background', (req, res) => {
		// Write image to user-backgrounds
		backgrounds.upload()(req, res, async err => {
			if (err) {
				api.error(res, err);
				return;
			}

			// Add blurred version of image
			try {
				await backgrounds.blurUser(req.apiUser);
				api.success(res);
			} catch (err) {
				api.error(res, err);
			}

			socketIO.user(req.apiUser, 'background', 'upload');

			try {
				const responseObj = await backgrounds.get(req.apiUser);
				api.success(res, responseObj);
			} catch (err) {
				api.error(res, err);
			}
		});
	});

	app.delete('/background', async (req, res) => {
		try {
			await backgrounds.delete(req.apiUser);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}

		try {
			const responseObj = await backgrounds.get(req.apiUser);
			api.success(res, responseObj);
		} catch (err) {
			api.error(res, err);
		}
	});

};
