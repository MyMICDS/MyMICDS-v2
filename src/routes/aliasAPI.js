'use strict';

/**
 * @file Manages alias API endpoints
 */

var aliases = require(__dirname + "/../libs/aliases.js");

module.exports = function(app, db) {

	app.post('/alias/add', function(req, res) {
		aliases.add(db, req.user.user, req.body.type, req.body.classString, req.body.classId, function(err, aliasId) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage, id: aliasId });
		});
	});

	app.post('/alias/list', function(req, res) {
		aliases.list(db, req.user.user, function(err, aliases) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage, aliases: aliases });
		});
	});

	app.post('/alias/delete', function(req, res) {
		aliases.delete(db, req.user.user, req.body.type, req.body.id, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage });
		});
	});

}
