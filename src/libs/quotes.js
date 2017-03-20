module.exports = {
	getQuote : function (db, index, callback) {
		var quotesData = db.collection('quotes');
		quotesData.find({}).toArray(function(err, quotes) {
			if(err) {
				callback(new Error('There was a problem getting all the quotes from the database!'));
				return;
			}
			callback('{"author":"' + quotes[index].author + '","quote":"' + quotes[index].quote + '"}');
		});
	},
	
	insertQuote : function (db, author, quote, callback) {
		try {
			var quotesData = db.collection('quotes');
			quotesData.insertOne({
				"author":author,
				"quote":quote
			});
			callback("Success");
		}
		catch (Exception) {
			callback("There was a problem inserting the quote into the database!");
		}
	},
	
	getIndex : function (db, callback) {
		var quotesData = db.collection('quotes');
		quotesData.find({}).toArray(function(err, quotes) {
			if(err) {
				callback(new Error('There was a problem getting all the quotes from the database!'));
				return;
			}
			callback(quotes.length - 1);
		});
	},
}