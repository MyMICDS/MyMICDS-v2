/*modules.exports = {
	getQuote : function (db, index) {
		var quotesData = db.collection('quotes');
	quotesData.find({}).toArray(function(err, quotes) {
		if(err) {
			callback(new Error('There was a problem getting all the quotes from the database!'));
			return;
    }

	return '{"author":"' + quotes[index].author + '":"quote":' + quotes[index].quote + '"}';
    // Whatever else you wanna do
	});
	}
}*/