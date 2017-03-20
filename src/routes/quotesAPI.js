var quotes = require(__dirname + '/../libs/quotes.js');

module.exports = function(app, db) {
var count = 0;
var maxIndex;

quotes.getIndex(db, function (index) {
	maxIndex = index;
});

/**
	This retrieves quotes
*/

app.post('/quote/get', function (req, res) {
	if (count > maxIndex) {
		count = 0;
		quotes.getQuote(db, count, function (result) {
			res.json({quote:JSON.parse(result).quote, author:JSON.parse(result).author});
		});
		count++;
	}
	
	else {
		quotes.getQuote(db, count, function (result) {
			res.json({quote:JSON.parse(result).quote, author:JSON.parse(result).author});
		});
		count++;
	}
});

app.post('/quote/insert', function (req, res) {
	// insert quote to collection
	quotes.insertQuote(db, req.body.author, req.body.quote, function (result) {
		res.end(result);
	});
});
};