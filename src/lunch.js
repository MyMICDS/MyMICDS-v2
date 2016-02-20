'use strict';

var Lunch = require('./getLunch.js');
var ejs = require('ejs')
var getLunch = new Lunch;
var lunchObject = {};
var express = require('express');
var lunchApp = express();

var templateString = null;
var fs = require('fs');
var templateString = fs.readFileSync('./html/lunch.ejs', 'utf-8');

getLunch.on("end", function (l) {
	lunchObject = l;
});
getLunch.on("error", function (err) {
	console.dir(err);
});

delete lunchObject.info;

//prepairing the lunch template with ejs.
lunchApp.set('view engine', 'ejs');

var lunchHTML = ejs.render(templateString, {lunchObject: lunchObject});

//Routing
lunchApp.get("/lunch", function (req, res) {
	res.setHeader('Content-Type', 'text/html');
	if (typeof lunchHTML != "undefined") {res.send(lunchHTML);} else {res.send('<h1>undefined</h1>')};
});

lunchApp.listen("3000", function () {
	console.log('listening on port 3000')
});
