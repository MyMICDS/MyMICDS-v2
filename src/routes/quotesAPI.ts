/**
 * @file Manages quotes API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const quotes = require(__dirname + '/../libs/quotes.js');

const Random = require('random-js');
const engine = Random.engines.mt19937().autoSeed();

module.exports = (app, db) => {

	app.get('/quote', async (req, res) => {
		try {
			const quotesResult = await quotes.get(db);
			const quote = Random.pick(engine, quotesResult);
			api.success(res, { quote });
		} catch (err) {
			api.error(res, err);
		}
	});

	app.post('/quote', async (req, res) => {
		try {
			await quotes.insert(db, req.body.author, req.body.quote);
			api.success(res);
		} catch (err) {
			api.error(res, err);
		}
	});

};
