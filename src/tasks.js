'use strict';

/**
 * @file Manages regularly scheduled tasks (similar to Cron-Jobs)
 */

let config;
try {
	config = require(__dirname + '/libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}
const fs            = require('fs-extra');

const admins        = require(__dirname + '/libs/admins.js');
const dailyBulletin = require(__dirname + '/libs/dailyBulletin.js');
const feeds         = require(__dirname + '/libs/feeds.js');
const later         = require('later');
const MongoClient   = require('mongodb').MongoClient;
const weather       = require(__dirname + '/libs/weather.js');
const utils         = require(__dirname + '/libs/utils.js');

// Only run these intervals in production so we don't waste our API calls
if(config.production) {

	console.log('Starting tasks server!');

	MongoClient.connect(config.mongodb.uri, (err, db) => {
		if(err) throw err;

		const fiveMinuteInterval = later.parse.text('every 5 min');

		/*
		 * Get Daily Bulletin every 5 minutes
		 */

		later.setInterval(() => {
			console.log(`[${new Date()}] Check for latest Daily Bulletin`);

			dailyBulletin.queryLatest(err => {
				if (err) {
					console.log(`[${new Date()}] Error occured for Daily Bulletin! (${err})`);

					// Alert admins if there's an error querying the Daily Bulletin
					admins.sendEmail(db, {
						subject: 'Error Notification - Daily Bulletin Retrieval',
						html: 'There was an error when retrieving the daily bulletin.<br>Error message: ' + err
					}, err => {
						if (err) {
							console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
							return;
						}
						console.log(`[${new Date()}] Alerted admins of error! (${err})`);
					});
				} else {
					const date = new Date();
					const formattedDate = date.getFullYear() + '-' + utils.leadingZeros((date.getMonth()+1)) + '-' + utils.leadingZeros((date.getDate()+1));
					const path = __dirname + '/public/daily-bulletin/' + formattedDate + '.pdf';

					dailyBulletin.parseBulletin(path).then((result) => {
						
						fs.writeFile(__dirname + '/../public/parsed-daily-bulletin/' + formattedDate + '.pdf.json', JSON.stringify(result), (err) => {
							if (err) {
								console.log(`[${new Date()}] Error occurred parsing daily bulletin writing to file! (${err})`);
							}
							console.log(`[${new Date()}] Successfully parsed daily bulletin! ${formattedDate}`);
						});
						
					})
					.catch((err) => {
						console.log(`[${new Date()}] Error occurred parsing daily bulletin! (${err})`);
					});

					console.log(`[${new Date()}] Successfully got latest Daily Bulletin!`);
				}
			});

		}, fiveMinuteInterval);

		/*
		 * Get new weather info every 5 minutes
		 */

		later.setInterval(() => {
			console.log(`[${new Date()}] Update Weather`);

			weather.update(err => {
				if (err) {
					console.log(`[${new Date()}] Error occured for weather! (${err})`);

					// Alert admins if problem getting weather
					admins.sendEmail(db, {
						subject: 'Error Notification - Weather Retrieval',
						html: 'There was an error when retrieving the weather.<br>Error message: ' + err
					}, err => {
						if (err) {
							console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
							return;
						}
						console.log(`[${new Date()}] Alerted admins of error! (${err})`);
					});
				} else {
					console.log(`[${new Date()}] Successfully updated weather!`);
				}
			});

		}, fiveMinuteInterval);

		/*
		 * Process Portal queue every 15 minutes
		 */

		later.setInterval(() => {
			console.log(`[${new Date()}] Process Portal queue`);

			feeds.processPortalQueue(db, err => {
				if(err) {
					console.log(`[${new Date()}] Error occurred processing Portal queue! (${err})`);

					// Alert admins if there's an error processing the Portal queue
					admins.sendEmail(db, {
						subject: 'Error Notification - Portal Queue',
						html: 'There was an error when processing the Portal queue.<br>Error message: ' + err
					}, err => {
						if (err) {
							console.log(`[${new Date()}] Error occured when sending admin error notifications! (${err})`);
							return;
						}
						console.log(`[${new Date()}] Alerted admins of error! (${err})`);
					});
				} else {
					console.log(`[${new Date()}] Successfully processed Portal queue!`);
				}
			});
		}, later.parse.text('every 15 min'));

		/*
		 * Update everyone's Canvas cache over the course of 6 hours
		 */

		later.setInterval(() => {
			const userdata = db.collection('users');

			userdata.find({ confirmed: true }).toArray((err, users) => {
				function updateCache(i) {
					if(i >= users.length) return;

					setTimeout(() => {
						const user = users[i].user;

						feeds.updateCanvasCache(db, user, err => {
							if(err) {
								console.log(`[${new Date()}] Error occurred updating ${user}'s Canvas cache! (${err})`);
							} else {
								console.log(`[${new Date()}] Successfully updated ${user}'s Canvas cache!`);
							}

							updateCache(++i);
						});
					}, (6 * 60 * 60 * 1000) / users.length);
				}

				updateCache(0);
			});
		}, later.parse.text('every 6 hours'));

		/*
		 * Add everyone to the Portal queue over the course of 6 hours, but triggered every 24 hours
		 */

		later.setInterval(() => {
			const userdata = db.collection('users');

			userdata.find({ confirmed: true }).toArray((err, users) => {
				function addToQueue(i) {
					if(i >= users.length) return;

					setTimeout(() => {
						const user = users[i].user;

						feeds.addPortalQueue(db, user, err => {
							if(err) {
								console.log(`[${new Date()}] Error occurred adding ${user} to the Portal queue! (${err})`);
							} else {
								console.log(`[${new Date()}] Successfully added ${user} to the Portal queue!`);
							}

							addToQueue(++i);
						});
					}, (6 * 60 * 60 * 1000) / users.length);
				}

				addToQueue(0);
			});
		}, later.parse.text('every 24 hours'));

	});
} else {
	console.log('Not starting tasks server because we are not on production.');
}
