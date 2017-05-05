'use strict';

const dates = require(__dirname + '/../libs/dates.js');

dates.getBreaks((err, breaks) => {
	console.log(err, breaks); // eslint-disable-line
});
