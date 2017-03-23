'use strict';

const quotes = require(__dirname + '/../libs/quotes.js');

const Random = require("random-js");
const engine = Random.engines.mt19937().autoSeed();

module.exports = (app, db) => {

	app.post('/quote/get', (req, res) => {
		quotes.get(db, (err, quotes) => {
			let quote;
			let errorMessage;
			if(err) {
				errorMessage = err.message;
				quote = null;
			} else {
				errorMessage = null;
				quote = Random.pick(engine, quotes);
			}

			res.json({
				error: errorMessage,
				quote: quote
			});
		});
	});

	app.post('/quote/insert', (req, res) => {
		quotes.insert(db, req.body.author, req.body.quote, err => {
			let errorMessage;
			if(err) {
				errorMessage = err.message;
			} else {
				errorMessage = null;
			}

			res.json({ error: errorMessage });
		});
	});

};
