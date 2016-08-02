'use strict';

/**
 * @file Manages Background API endpoints
 */

var backgrounds = require(__dirname + '/../libs/backgrounds.js');

module.exports = function(app, db) {

	app.post('/background/get', function(req, res) {
		backgrounds.getBackground(req.user.user, function(err, backgroundURLs) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				urls : backgroundURLs
			});
		});
	});

	app.post('/background/upload', function(req, res) {
		// Write image to user-backgrounds
		backgrounds.uploadBackground(db)(req, res, function(err) {
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
		backgrounds.deleteBackground(req.user.user, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
