var Lunch = require('./getLunch.js');
var getLunch = new Lunch;

var lunchObject = {};
getLunch.on("end", function (l) {
	lunchObject = l;
});
getLunch.on("error", function (err) {
	console.dir(err);
});

var express = require('express');
lunchApp = express();

lunchApp.get("/lunch", function (req, res) {
	res.setHeader('Content-Type', 'text/plain');
	res.send(lunchObject);
	res.end;
});

lunchApp.listen("3000", function () {
	console.log('Success')
});
