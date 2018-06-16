'use strict';

let config;
try {
	config = require(__dirname + '/../libs/config.js');
} catch (e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const MongoClient = require('mongodb').MongoClient;
const portal = require(__dirname + '/../libs/portal.js');

const user = process.argv[2];

MongoClient.connect(config.mongodb.uri).then(async db => {
	const { classes } = await portal.getClasses(db, user);

	if (!classes) throw 'Classes is null!';

	console.log(classes);
	console.log('');

	classes.forEach(className => {
		console.log(portal.cleanUp(className));
	});

	process.exit();
}).catch(err => {
	throw err;
});
