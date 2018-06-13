/**
 * @file Manages quotes API endpoints
 */

const api = require(__dirname + '/../libs/api.js');
const quotes = require(__dirname + '/../libs/quotes.js');

const Random = require('random-js');
const engine = Random.engines.mt19937().autoSeed();

module.exports = (app, db) => {

	app.get('/quote', (req, res) => {
		quotes.get(db, (err, quotes) => {
			let quote = null;
			if (!err) {
				quote = Random.pick(engine, quotes);
			}
			api.respond(res, err, { quote });
		});
	});

	app.post('/quote', (req, res) => {
		quotes.insert(db, req.body.author, req.body.quote, err => {
			api.respond(res, err);
		});
	});

};
