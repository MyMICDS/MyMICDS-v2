/**
 * @file Manages Background API endpoints
 */
const backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = (app, db, socketIO) => {

	app.post('/background/get', (req, res) => {
		backgrounds.get(req.user.user, (err, variants, hasDefault) => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error, variants, hasDefault });
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
				let error = null;
				if(err) {
					error = err.message;
				} else {
					socketIO.user(req.user.user, 'background', 'upload');
				}
				res.json({ error });
			});
		});
	});

	app.post('/background/delete', (req, res) => {
		backgrounds.delete(req.user.user, err => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'background', 'delete');
			}
			res.json({ error });
		});
	});

};
