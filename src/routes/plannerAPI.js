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
		var start = new Date(req.body['start-year'], req.body['start-month'] - 1, req.body['start-day']);
		var end   = new Date(req.body['end-year'], req.body['end-month'] - 1, req.body['end-day']);

		var insertEvent = {
			id     : req.body.id,
			title  : req.body.title,
			desc   : req.body.desc,
			classId: req.body['class-id'],
			start  : start,
			end    : end,
			link   : req.body.link
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
