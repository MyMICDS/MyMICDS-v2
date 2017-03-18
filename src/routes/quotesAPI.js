var quotes = require(__dirname + '/../libs/quotes.js');

module.exports = function(app, db) {
var count = 0;
/**
	This retrieves quotes
*/

app.post('/quote/get', function (req, res) {
	
	var quotesData = db.collection('quotes');
	quotesData.find({}).toArray(function(err, quotes) {
		if(err) {
			callback(new Error('There was a problem getting all the quotes from the database!'));
			return;
    }
	try {
	res.json({author : quotes[global.count].author, quote: quotes[global.count].quote});
	++global.count;
	}
	catch (Exception) {
		global.count = 0;
		res.json({author : quotes[global.count].author, quote: quotes[global.count].quote});
	}
	});
	});

app.post('/quote/insert', function (req, res) {
	// insert quote to collection
	var quotesData = db.collection('quotes');
	quotesData.insertOne({
		"author":req.body.author,
		"quote":req.body.quote
	});
	
	res.end("Complete");
});
};