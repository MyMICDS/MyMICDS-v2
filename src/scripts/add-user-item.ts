// tslint:disable:no-console

import * as crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { promisify } from 'util';
import config from '../libs/config';

// Connect to database
(MongoClient.connect as (uri: string) => Promise<MongoClient>)(config.mongodb.uri).then(async client => {
	const db = client.db();
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
