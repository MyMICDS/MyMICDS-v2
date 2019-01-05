// tslint:disable:no-console

import * as later from 'later';
import { MongoClient } from 'mongodb';
import * as admins from './libs/admins';
import config from './libs/config';
import * as dailyBulletin from './libs/dailyBulletin';
import * as feeds from './libs/feeds';
import * as weather from './libs/weather';

// Only run these intervals in production so we don't waste our API calls
if (config.production) {
	console.log('Starting tasks server!');

	MongoClient.connect(config.mongodb.uri).then(async (client: MongoClient) => {
		const db = client.db();
		const fiveMinuteInterval = later.parse.text('every 5 min');

		/*
		 * Get Daily Bulletin every 5 minutes
		 */

		later.setInterval(async () => {
			console.log(`[${new Date()}] Check for latest Daily Bulletin`);

			try {
				await dailyBulletin.queryLatest();

				console.log(`[${new Date()}] Successfully got latest Daily Bulletin!`);
			} catch (err) {
				console.log(`[${new Date()}] Error occured for Daily Bulletin! (${err})`);

				// Alert admins if there's an error querying the Daily Bulletin
				try {
					await admins.sendEmail(db, {
						subject: 'Error Notification - Daily Bulletin Retrieval',
						html: 'There was an error when retrieving the daily bulletin.<br>Error message: ' + err
					});

					console.log(`[${new Date()}] Alerted admins of error! (${err})`);
				} catch (err) {
					console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
				}
			}
		}, fiveMinuteInterval);

		/*
		 * Get new weather info every 5 minutes
		 */

		later.setInterval(async () => {
			console.log(`[${new Date()}] Update Weather`);

			try {
				await weather.update();

				console.log(`[${new Date()}] Successfully updated weather!`);
			} catch (err) {
				console.log(`[${new Date()}] Error occured for weather! (${err})`);

				// Alert admins if problem getting weather
				try {
					await admins.sendEmail(db, {
						subject: 'Error Notification - Weather Retrieval',
						html: 'There was an error when retrieving the weather.<br>Error message: ' + err
					});

					console.log(`[${new Date()}] Alerted admins of error! (${err})`);
				} catch (err) {
					console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
				}
			}
		}, fiveMinuteInterval);

		/*
		 * Process Portal queue every 15 minutes
		 */

		later.setInterval(async () => {
			console.log(`[${new Date()}] Process Portal queue`);

			try {
				await feeds.processPortalQueue(db);

				console.log(`[${new Date()}] Successfully processed Portal queue!`);
			} catch (err) {
				console.log(`[${new Date()}] Error occurred processing Portal queue! (${err})`);

				// Alert admins if there's an error processing the Portal queue
				try {
					await admins.sendEmail(db, {
						subject: 'Error Notification - Portal Queue',
						html: 'There was an error when processing the Portal queue.<br>Error message: ' + err
					});

					console.log(`[${new Date()}] Alerted admins of error! (${err})`);
				} catch (err) {
					console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
				}
			}
		}, later.parse.text('every 15 min'));

		/*
		 * Update everyone's Canvas cache over the course of 6 hours
		 */

		later.setInterval(async () => {
			const userdata = db.collection('users');

			const users = await userdata.find({ confirmed: true }).toArray();

			for (const user of users) {
				setTimeout(async () => {
					try {
						await feeds.updateCanvasCache(db, user);

						console.log(`[${new Date()}] Successfully updated ${user}'s Canvas cache!`);
					} catch (err) {
						console.log(`[${new Date()}] Error occurred updating ${user}'s Canvas cache! (${err})`);
					}
				}, (6 * 60 * 60 * 1000) / users.length);
			}
		}, later.parse.text('every 6 hours'));

		/*
		 * Add everyone to the Portal queue over the course of 6 hours, but triggered every 24 hours
		 */

		later.setInterval(async () => {
			const userdata = db.collection('users');

			const users = await userdata.find({ confirmed: true }).toArray();

			for (const user of users) {
				setTimeout(async () => {
					try {
						await feeds.addPortalQueueClasses(db, user);

						console.log(`[${new Date()}] Successfully added ${user} to the Portal Classes queue!`);
					} catch (err) {
						console.log(`[${new Date()}] Error occurred adding ${user} to the Portal queue! Classes (${err})`);
					}

					try {
						await feeds.addPortalQueueCalendar(db, user);

						console.log(`[${new Date()}] Successfully added ${user} to the Portal Calendar queue!`);
					} catch (err) {
						console.log(`[${new Date()}] Error occurred adding ${user} to the Portal Calendar queue! (${err})`);
					}
				}, (6 * 60 * 60 * 1000) / users.length);
			}
		}, later.parse.text('every 24 hours'));
	}).catch(err => {
		throw err;
	});
} else {
	console.log('Not starting tasks server because we are not on production.');
}
