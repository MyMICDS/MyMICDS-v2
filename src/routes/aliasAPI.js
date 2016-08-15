'use strict';

/**
 * @file Manages alias API endpoints
 */

var alias = require(__dirname + "/../libs/alias.js");

module.exports = function(app, db) {

	app.post('/alias/add', function(req, res) {
		alias.add(db, req.user.user, req.body.type, req.body.classString, req.body.classId, function(err, aliasId) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage, id: aliasId });
		});
	});

	app.post('/alias/list', function(req, res) {
		alias.list(db, req.user.user, function(err, aliases) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage, aliases: aliases });
		});
	});

	app.post('/alias/delete', function(req, res) {
		alias.delete(db, req.user.user, req.body.id, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage });
		});
	});

}
