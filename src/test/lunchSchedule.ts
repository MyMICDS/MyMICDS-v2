import { MongoClient } from 'mongodb';
import * as schedule from '../libs/schedule';
import config from '../libs/config';
import moment from 'moment';

const times = 7;
const user = 'alhuber';
const date = moment().add(5, 'days');

MongoClient.connect(config.mongodb.uri)
	.then(async (client: MongoClient) => {
		const db = client.db();
		for (let i = 0; i < times; i++) {
			const { schedule: scheduleObj } = await schedule.get(db, user, date.toDate());

			const names = (scheduleObj.classes as schedule.ScheduleClasses).map(b => b.class.name);

			console.log(names);
		}
	})
	.catch(err => {
		throw err;
	});
