'use strict';

let config;
try {
	config = require(__dirname + '/../libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const { MongoClient } = require('mongodb');
const notifications = require(__dirname + '/../libs/notifications.js');

const subject = process.argv[2];
const path = process.argv[3];

MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	const userdata = db.collection('users');

	userdata.find({ confirmed: true }).toArray((err, users) => {
		if(err) throw err;

		notifications.newsletter({ subject, path });

		notifications.notify(db, users, 'newsletter', {}, err => {
			if(err) throw err;

			console.log('Successfully sent newsletter to everyone!');
		});
	});
});
