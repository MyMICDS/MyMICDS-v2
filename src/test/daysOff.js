const dates = require(__dirname + '/../libs/dates.js');

dates.getBreaks().then(breaks => {
	console.log(breaks);
}).catch(err => {
	throw err;
});
