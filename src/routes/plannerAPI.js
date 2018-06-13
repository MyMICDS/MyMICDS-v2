/**
 * @file Manages planner API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const checkedEvents = require(__dirname + '/../libs/checkedEvents.js');
const planner = require(__dirname + '/../libs/planner.js');

module.exports = (app, db, socketIO) => {

	app.get('/planner', (req, res) => {
		planner.get(db, req.apiUser, (err, events) => {
			api.respond(res, err, { events });
		});
	});

	app.post('/planner', (req, res) => {

		let start = new Date();
		if (req.body.start) {
			start = new Date(req.body.start);
		}

		let end = new Date();
		if (req.body.end) {
			end = new Date(req.body.end);
		}

		const insertEvent = {
			_id    : req.body.id,
			title  : req.body.title,
			desc   : req.body.desc,
			classId: req.body.classId,
			start,
			end
		};

		planner.upsert(db, req.apiUser, insertEvent, (err, plannerEvent) => {
			if (err) {
				api.respond(res, err);
				return;
			}

			socketIO.user(req.apiUser, 'planner', 'add', plannerEvent);

			planner.get(db, req.apiUser, (err, events) => {
				api.respond(res, err, { events });
			});
		});
	});

	app.delete('/planner', (req, res) => {
		planner.delete(db, req.apiUser, req.body.id, err => {
			if (!err) {
				socketIO.user(req.apiUser, 'planner', 'delete', req.body.id);
			}
			api.respond(res, err);
		});
	});

	app.patch('/planner/check', (req, res) => {
		checkedEvents.check(db, req.apiUser, req.body.id, err => {
			if (!err) {
				socketIO.user(req.apiUser, 'planner', 'check', req.body.id);
			}
			api.respond(res, err);
		});
	});

	app.patch('/planner/uncheck', (req, res) => {
		checkedEvents.uncheck(db, req.apiUser, req.body.id, err => {
			if (!err) {
				socketIO.user(req.apiUser, 'planner', 'uncheck', req.body.id);
			}
			api.respond(res, err);
		});
	});

};
