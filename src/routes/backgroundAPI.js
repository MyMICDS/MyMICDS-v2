/**
 * @file Manages Background API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = (app, db, socketIO) => {

	app.post('/background/get', (req, res) => {
		backgrounds.get(req.apiUser, (err, variants, hasDefault) => {
			api.respond(res, err, { hasDefault, variants });
		});
	});

	app.post('/background/upload', (req, res) => {
		// Write image to user-backgrounds
		backgrounds.upload()(req, res, err => {
			if(err) {
				api.respond(res, err);
				return;
			}

			// Add blurred version of image
			backgrounds.blurUser(req.apiUser, err => {
				if(err) {
					api.respond(res, err);
					return;
				}

				socketIO.user(req.apiUser, 'background', 'upload');

				backgrounds.get(req.apiUser, (err, variants, hasDefault) => {
					api.respond(res, err, { hasDefault, variants });
				});

			});
		});
	});

	app.post('/background/delete', (req, res) => {
		backgrounds.delete(req.apiUser, err => {
			if(err) {
				api.respond(res, err);
				return;
			}

			socketIO.user(req.apiUser, 'background', 'delete');

			backgrounds.get(req.apiUser, (err, variants, hasDefault) => {
				res.respond(res, err, { hasDefault, variants });
			});
		});
	});

};
