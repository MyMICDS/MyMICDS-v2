'use strict';

const quotes = require(__dirname + '/../libs/quotes.js');

const Random = require('random-js');
const engine = Random.engines.mt19937().autoSeed();

module.exports = (app, db) => {

	app.post('/quote/get', (req, res) => {
		quotes.get(db, (err, quotes) => {
			let error = null;
			let quote = null;

			if(err) {
				error = err.message;
			} else {
				quote = Random.pick(engine, quotes);
			}

			res.json({ error, quote });
		});
	});

	app.post('/quote/insert', (req, res) => {
		quotes.insert(db, req.body.author, req.body.quote, err => {
			let error = null;
			if(err) {
				error = err.message;
			}
			res.json({ error });
		});
	});

};
