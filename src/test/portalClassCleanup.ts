import { MongoClient } from 'mongodb';
import config from '../libs/config';
import * as portal from '../libs/portal';

const user = process.argv[2];

MongoClient.connect(config.mongodb.uri).then(async (client: MongoClient) => {
	const db = client.db();
	const { classes } = await portal.getClasses(db, user);

	if (!classes) { throw new Error('Classes is null!'); }

	console.log(classes);
	console.log('');

	classes.forEach(className => {
		console.log(portal.cleanUp(className));
	});

	process.exit();
}).catch(err => {
	throw err;
});
