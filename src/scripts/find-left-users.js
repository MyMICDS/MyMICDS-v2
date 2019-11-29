/**
 * @file Add a property to existing users
 */

const { classEmails } = require('./class-emails.json');

const missing = [];

let config;
try {
	config = require(__dirname + '/../libs/config');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const MongoClient = require('mongodb').MongoClient;

// Connect to database
MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	const userdata = db.collection('users');

	// Get all users
	userdata.find({}).toArray((err, userDocs) => {
		const dbEmails = userDocs.map(userDocs => userDocs.user);

		for (const checkEmail of classEmails) {
			const checkUser = checkEmail.split('@')[0];
			if (!dbEmails.includes(checkUser)) {
				missing.push(checkUser);
			}
		}

		// All done!
		console.log(`All done! Missing emails (${missing.length}):`, missing);
		process.exit();
	});
});
