/**
 * @file Sends an email to all users
 * PLEASE USE THIS WITH CAUTION
 */

let config;
try {
	config = require(__dirname + '/../libs/config');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

const subject = 'MyMICDS Site Migration';
const messageDir = __dirname + '/../html/messages/burroughs.html';
// Path to JSON file to keep track of who's been sent the email already (in case script stops halfway through)
const blacklistPath = __dirname + '/blacklist.json';

// ONLY SET THIS TO TRUE IF YOU KNOW FOR SURE YOU WANNA DO THIS
// Please set to false once you're done using this script
const I_REALLY_WANT_TO_DO_THIS = false;
// Must set `I_REALLY_WANT_TO_DO_THIS` to true. Will limit email recipients to only `debugList`
// Please set to true once you're done using this script
const DEBUG = true;
const debugList = ['mgira', 'nclifford', 'jcai'];

const fs = require('fs-extra');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const mail = require(__dirname + '/../libs/mail');

if (!I_REALLY_WANT_TO_DO_THIS) {
	console.log('Are you sure you really want to do this? Set `I_REALLY_WANT_TO_DO_THIS` to true on line 20. Make sure to set back to false before committing.');
	process.exit();
}

// See who we've already sent email to
getBlacklist((err, blacklist) => {
	if (err) throw err;

	// Connect to database
	MongoClient.connect(config.mongodb.uri, (err, db) => {
		if(err) throw err;

		const userdata = db.collection('users');

		// Get all users
		userdata.find({ confirmed: true }).toArray((err, userDocs) => {
			if (err) throw err;

			const startTime = Date.now();

			function getDuration() {
				const duration = moment.duration(Date.now() - startTime);
				return `${duration.minutes()}:${duration.seconds().toString().padStart(2, '0')}.${duration.milliseconds().toString().padStart(3, '0')}`;
			}

			sendEmail(0);
			function sendEmail(i) {
				const percent = (((i + 1) / userDocs.length) * 100).toFixed(2);
				if (i < userDocs.length) {
					const userDoc = userDocs[i];

					// If we're in debug mode
					if (DEBUG && !debugList.includes(userDoc.user)) {
						console.log(`[${getDuration()}] Skipping user ${userDoc.user} because we're in debug mode. ${percent}% complete (${i + 1} / ${userDocs.length})`);
						setTimeout(() => {
							sendEmail(++i);
						});
						return;
					}

					// Make sure we haven't already sent user the email
					if (typeof blacklist[userDoc.user] !== 'undefined') {
						console.log(`[${getDuration()}] Skipping user ${userDoc.user} because they are already in blacklist. ${percent}% complete (${i + 1} / ${userDocs.length})`);
						setTimeout(() => {
							sendEmail(++i);
						});
						return;
					}

					// Send email
					const email = userDoc.user + '@micds.org';
					const emailReplace = {
						firstName: userDoc.firstName
					};
					const startEmailTime = Date.now();
					console.log(`[${getDuration()}] Sending email for ${userDoc.user}...`);
					mail.sendHTML(email, subject, messageDir, emailReplace, () => {
						const emailSendDuration = Date.now() - startEmailTime;
						console.log(`[${getDuration()}] Email for ${userDoc.user} sent! Took ${emailSendDuration} ms. ${percent}% complete (${i + 1} / ${userDocs.length})`);
						blacklistUser(userDoc.user, err => {
							if (err) throw err;
							setTimeout(() => {
								sendEmail(++i);
							});
						});
					});
				} else {
					console.log('All done!');
					process.exit();
				}
			}
		});
	});
});

/**
 * Prevent user from being sent mail
 */

function blacklistUser(user, callback) {
	getBlacklist((err, blacklist) => {
		blacklist[user] = Date.now();
		fs.outputJson(blacklistPath, blacklist, { spaces: '\t' }, (err) => {
			if (err) {
				callback(err, null);
				return;
			}
			callback(null, blacklist);
		});
	});
}

/**
 * Get blacklist
 */

function getBlacklist(callback) {
	fs.ensureFile(blacklistPath, err => {
		if (err) {
			callback(err, null);
			return;
		}
		fs.readFile(blacklistPath, 'utf8', (err, data) => {
			if (err) {
				callback(err, null);
				return;
			}
			let blacklist = {};
			if (0 < data.length) {
				try {
					blacklist = JSON.parse(data);
				} catch (err) {
					callback(err, null);
					return;
				}
			}
			callback(null, blacklist);
		});
	});
}