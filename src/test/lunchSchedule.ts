'use strict';

let config;
try {
	config = require(__dirname + '/../libs/config.js');
} catch (e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const schedule = require(__dirname + '/../libs/schedule.js');

const times = 7;
const user = 'alhuber';
const date = moment().add(5, 'days');

MongoClient.connect(config.mongodb.uri).then(async db => {
	for (let i = 0; i < times; i++) {
		const { schedule: scheduleObj } = await schedule.get(db, user, date);

		const names = scheduleObj.classes.map(b => b.class.name);

		console.log(names);
	}
}).catch(err => {
	throw err;
});
