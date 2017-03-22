'use strict';

try {
	const config = require(__dirname + '/../libs/config.js');	
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const MongoClient = require('mongodb').MongoClient;
const portal = require(__dirname + '/../libs/portal.js');

let user = process.argv[2];

MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	portal.getClasses(db, user, (err, hasURL, classes) => {
		if(!classes) throw 'Classes is null!';

		console.log(classes);
		console.log('');

		classes.forEach(className => {
			console.log(portal.cleanUp(className));
		});

		process.exit();
	});
});
