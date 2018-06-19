/**
 * @file Manages planner API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const checkedEvents = require(__dirname + '/../libs/checkedEvents.js');
const planner = require(__dirname + '/../libs/planner.js');

module.exports = (app, db, socketIO) => {

	app.get('/planner', async (req, res) => {
		try {
			const events = await planner.get(db, req.apiUser);
			api.success(res, { events });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/planner', async (req, res) => {

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

		try {
			const plannerEvent = await planner.upsert(db, req.apiUser, insertEvent);
			socketIO.user(req.apiUser, 'planner', 'add', plannerEvent);

			try {
				const events = await planner.get(db, req.apiUser);
				api.success(res, { events });
			} catch (err) {
				api.error(res, err);
			}
		} catch (err) {
			api.error(res, err);
		}
	});

	app.delete('/planner', async (req, res) => {
		try {
			await planner.delete(db, req.apiUser, req.body.id);
			socketIO.user(req.apiUser, 'planner', 'delete', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.patch('/planner/check', async (req, res) => {
		try {
			await checkedEvents.check(db, req.apiUser, req.body.id);
			socketIO.user(req.apiUser, 'planner', 'check', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.patch('/planner/uncheck', async (req, res) => {
		try {
			await checkedEvents.uncheck(db, req.apiUser, req.body.id);
			socketIO.user(req.apiUser, 'planner', 'uncheck', req.body.id);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};
