'use strict';

/**
 * @file Manages planner API endpoints
 */

var planner = require(__dirname + '/../libs/planner.js');

module.exports = function(app, db) {

	app.post('/planner/get', function(req, res) {
		var date = {
			year : parseInt(req.body.year),
			month: parseInt(req.body.month)
		};

		planner.getMonthEvents(db, req.user.user, date, true, function(err, events) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({
				error : errorMessage,
				events: events
			});
		});
	});

	app.post('/planner/add', function(req, res) {

		var start = new Date();
		if(req.body.start) {
			start = new Date(req.body.start);
		}

		var end = new Date();
		if(req.body.end) {
			end = new Date(req.body.end);
		}

		var insertEvent = {
			id     : req.body.id,
			title  : req.body.title,
			desc   : req.body.desc,
			classId: req.body.classId,
			start  : start,
			end    : end
		};

		planner.upsertEvent(db, req.user.user, insertEvent, function(err, id) {
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

	app.post('/planner/delete', function(req, res) {
		planner.deleteEvent(db, req.user.user, req.body.id, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}
