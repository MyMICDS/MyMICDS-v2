/**
 * @file Add a property to existing users
 */

let config;
try {
	config = require(__dirname + '/../libs/config');
} catch (e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;

const { promisify } = require('util');

// Connect to database
MongoClient.connect(config.mongodb.uri).then(async db => {
	const userdata = db.collection('users');

	// Get all users
	const userDocs = await userdata.find({}).toArray();

	for (const userDoc of userDocs) {
		const buf = await promisify(crypto.randomBytes)(16);

		const unsubscribeHash = buf.toString('hex');

		// Update user doc
		await userdata.updateOne({ _id: userDoc._id }, { $set: { unsubscribeHash } });

		console.log(`Successfully added unsubscribe hash for ${userDoc.user}!`);
	}

	// All done!
	console.log('All done!');
	process.exit();
}).catch(err => {
	throw err;
});
