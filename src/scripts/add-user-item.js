/**
 * @file Add a property to existing users
 */

let config;
try {
	config = require(__dirname + '/../libs/config');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;

// Connect to database
MongoClient.connect(config.mongodb.uri, (err, db) => {
	if(err) throw err;

	const userdata = db.collection('users');

	// Get all users
	userdata.find({}).toArray((err, userDocs) => {
		addItem(0);
		function addItem(i) {
			if (i < userDocs.length) {
				const userDoc = userDocs[i];

				// Generate unsubscribe email hash
				crypto.randomBytes(16, (err, buf) => {
					if(err) throw err;

					const unsubscribeHash = buf.toString('hex');

					// Update user doc
					userdata.update({ _id: userDoc._id }, { $set: { unsubscribeHash } }, err => {
						if(err) throw err;
						console.log(`Successfully added unsubscribe hash for ${userDoc.user}!`);
						addItem(++i);
					});
				});
			} else {
				// All done!
				console.log('All done!');
			}
		}
	});
});
