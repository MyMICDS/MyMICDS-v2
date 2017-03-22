'use strict';

var quotes = require(__dirname + '/../libs/quotes.js');

var Random = require("random-js");
var engine = Random.engines.mt19937().autoSeed();

module.exports = (app, db) => {

	app.post('/quote/get', (req, res) => {
		quotes.get(db, (err, quotes) => {
			if(err) {
				var errorMessage = err.message;
				var quote = null;
			} else {
				var errorMessage = null;
				var quote = Random.pick(engine, quotes);
			}

			res.json({
				error: errorMessage,
				quote: quote
			});
		});
	});

	app.post('/quote/insert', (req, res) => {
		quotes.insert(db, req.body.author, req.body.quote, err => {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({ error: errorMessage });
		});
	});

};
