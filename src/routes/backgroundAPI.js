'use strict';

/**
 * @file Manages Background API endpoints
 */
const backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = (app, db, socketIO) => {

	app.post('/background/get', (req, res) => {
		backgrounds.get(req.user.user, (err, variants, hasDefault) => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}
			res.json({
				error: errorMessage,
				variants: variants,
				hasDefault: hasDefault
			});
		});
	});

	app.post('/background/upload', (req, res) => {
		// Write image to user-backgrounds
		backgrounds.upload(req, res, err => {
			if(err) {
				res.json({ error: err.message });
				return;
			}

			// Add blurred version of image
			backgrounds.blurUser(req.user.user, err => {
				let errorMessage;
				if(err) {
					errorMessage = err.message;
				} else {
					errorMessage = null;
					socketIO.user(req.user.user, 'background', 'upload');
				}
				res.json({ error: errorMessage });
			});
		});
	});

	app.post('/background/delete', (req, res) => {
		backgrounds.delete(req.user.user, err => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
				socketIO.user(req.user.user, 'background', 'delete');
			}
			res.json({ error: errorMessage });
		});
	});

};
