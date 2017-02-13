'use strict';

try {
	var config = require(__dirname + '/../libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var schedule = require(__dirname + '/../libs/schedule.js');

var user = process.argv[2];

var times = 7;

MongoClient.connect(config.mongodb.uri, function(err, db) {
	if(err) throw err;

	function testSchedule(date, user) {
		if(times-- > 0) {
			date = date || moment().add(5, 'days');
			user = user || 'alhuber';
			schedule.get(db, user, date, function(err, hasURL, schedule) {
				if(err) throw err;
				// console.log(schedule);

				var names = [];
				schedule.classes.forEach(function(block) {
					names.push(block.class.name);
				});

				console.log(names);

				// testSchedule(date.add(1, 'day'));
				testSchedule(date, 'mgira');
			});
		}
	}
	testSchedule();
});
