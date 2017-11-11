'use strict';

/**
 * @file Manages Daily Bulletin API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const dailyBulletin = require(__dirname + '/../libs/dailyBulletin.js');
const jwt = require(__dirname + '/../libs/jwt.js');

module.exports = (app) => {

	app.post('/daily-bulletin/list', (req, res) => {
		dailyBulletin.getList((err, bulletins) => {
			api.respond(res, err, {
				baseURL: dailyBulletin.baseURL,
				bulletins
			});
		});
	});

	app.post('/daily-bulletin/query', jwt.requireScope('admin'), (req, res) => {
		dailyBulletin.queryLatest(err => {
			api.respond(res, err);
		});
	});

	app.post('/daily-bulletin/query-all', jwt.requireScope('admin'), (req, res) => {
		dailyBulletin.queryAll(err => {
			api.respond(res, err);
		});
	});

};
