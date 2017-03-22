'use strict';

try {
	const config = require(__dirname + '/../libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const schedule = require(__dirname + '/../libs/schedule.js');

let user = process.argv[2];

let times = 7;

MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	function testSchedule(date, user) {
		if(times-- > 0) {
			date = date || moment().add(5, 'days');
			user = user || 'alhuber';
			schedule.get(db, user, date, (err, hasURL, schedule) => {
				if(err) throw err;
				// console.log(schedule);

				let names = [];
				schedule.classes.forEach(block => {
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
