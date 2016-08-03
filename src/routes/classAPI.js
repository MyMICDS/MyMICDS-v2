'use strict';

/**
 * @file Manages class API endpoints
 */

var classes = require(__dirname + '/../libs/classes.js');

module.exports = function(app, db) {

	app.post('/classes/get', function(req, res) {
		classes.get(db, req.user.user, function(err, classes) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				classes: classes
			});
		});
	});

	app.post('/classes/add', function(req, res) {
		var user = req.user.user;
		var scheduleClass = {
			id  : req.body.id,
			name: req.body.name,
			color: req.body.color,
			block: req.body.block,
			type : req.body.type,
			teacher: {
				prefix: req.body.teacherPrefix,
				firstName: req.body.teacherFirstName,
				lastName : req.body.teacherLastName
			}
		};

		classes.upsert(db, user, scheduleClass, function(err, id) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error: errorMessage,
				id: id
			});
		});
	});

	app.post('/classes/delete', function(req, res) {
		classes.delete(db, req.user.user, req.body.id, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

};
