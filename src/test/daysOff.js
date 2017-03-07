'use strict';

var dates = require(__dirname + '/../libs/dates.js');

dates.getBreaks(function(err, days) {
	console.log(err, days);
});
