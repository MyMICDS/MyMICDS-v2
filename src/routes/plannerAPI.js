'use strict';

/**
 * @file Manages planner API endpoints
 */

var checkedEvents = require(__dirname + '/../libs/checkedEvents.js');
var planner = require(__dirname + '/../libs/planner.js');

module.exports = (app, db, socketIO) => {

	app.post('/planner/get', (req, res) => {
		var date = {
			year : parseInt(req.body.year),
			month: parseInt(req.body.month)
		};

		planner.getMonthEvents(db, req.user.user, date, (err, events) => {
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

	app.post('/planner/add', (req, res) => {

		var start = new Date();
		if(req.body.start) {
			start = new Date(req.body.start);
		}

		var end = new Date();
		if(req.body.end) {
			end = new Date(req.body.end);
		}

		var insertEvent = {
			_id    : req.body.id,
			title  : req.body.title,
			desc   : req.body.desc,
			classId: req.body.classId,
			start  : start,
			end    : end
		};

		planner.upsertEvent(db, req.user.user, insertEvent, (err, plannerEvent) => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'planner', 'add', plannerEvent);
			}
			res.json({
				error: errorMessage,
				id: plannerEvent._id
			});
		});
	});

	app.post('/planner/delete', (req, res) => {
		planner.deleteEvent(db, req.user.user, req.body.id, err => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'planner', 'delete', req.body.id);
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/planner/check', (req, res) => {
		checkedEvents.check(db, req.user.user, req.body.id, err => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'planner', 'check', req.body.id);
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/planner/uncheck', (req, res) => {
		checkedEvents.uncheck(db, req.user.user, req.body.id, err => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
				socketIO.user(req.user.user, 'planner', 'uncheck', req.body.id);
			}
			res.json({ error: errorMessage });
		});
	});

};
