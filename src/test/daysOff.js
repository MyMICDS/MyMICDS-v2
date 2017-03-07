'use strict';

var dates = require(__dirname + '/../libs/dates.js');

dates.getBreaks(function(err, breaks) {
	console.log(err, breaks);
});
