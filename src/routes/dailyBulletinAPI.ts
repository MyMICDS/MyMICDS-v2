'use strict';

/**
 * @file Manages Daily Bulletin API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const dailyBulletin = require(__dirname + '/../libs/dailyBulletin.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app) => {

	app.get('/daily-bulletin', async (req, res) => {
		try {
			const bulletins = await dailyBulletin.getList();
			api.success(res, {
				baseURL: dailyBulletin.baseURL,
				bulletins
			});
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/daily-bulletin/query', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryLatest();
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/daily-bulletin/query-all', jwt.requireScope('admin'), async (req, res) => {
		try {
			await dailyBulletin.queryAll();
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};
