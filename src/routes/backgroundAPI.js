'use strict';

/**
 * @file Manages Background API endpoints
 */

var backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = function(app, db) {

	app.post('/background/get', function(req, res) {
		backgrounds.get(req.user.user, function(err, variants) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				variants: variants
			});
		});
	});

	app.post('/background/upload', function(req, res) {
		// Write image to user-backgrounds
		backgrounds.upload(db)(req, res, function(err) {
			if(err) {
				res.json({ error: err.message });
				return;
			}

			// Add blurred version of image
			backgrounds.blurUser(req.user.user, function(err) {
				if(err) {
					var errorMessage = err.message;
				} else {
					var errorMessage = null;
				}
				res.json({ error: errorMessage });
			});
		});
	});

	app.post('/background/delete', function(req, res) {
		backgrounds.delete(req.user.user, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
