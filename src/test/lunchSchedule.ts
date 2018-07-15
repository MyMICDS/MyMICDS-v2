// tslint:disable:no-console

import moment from 'moment';
import { MongoClient } from 'mongodb';
import config from '../libs/config';
import * as schedule from '../libs/schedule';

const times = 7;
const user = 'alhuber';
const date = moment().add(5, 'days');

(MongoClient.connect as (uri: string) => Promise<MongoClient>)(config.mongodb.uri).then(async client => {
	const db = client.db();
	for (let i = 0; i < times; i++) {
		const { schedule: scheduleObj } = await schedule.get(db, user, date.toDate());

		const names = (scheduleObj.classes as any[]).map<string>(b => b.class.name);

		console.log(names);
	}
}).catch(err => {
	throw err;
});
