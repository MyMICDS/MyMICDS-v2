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
// Path to JSON file to keep track of who's been sent the email already (in case script stops haflway through)
const blacklistPath = __dirname + '/blacklist.json';

// ONLY SET THIS TO TRUE IF YOU KNOW FOR SURE YOU WANNA DO THIS
// Please set to `false` once you're done using this script
const I_REALLY_WANT_TO_DO_THIS = false;
// Must set `I_REALLY_WANT_TO_DO_THIS` to true. Will limit email recipients to only `debugList`
const DEBUG = true;
const debugList = ['mgira', 'nclifford', 'jcai'];

const fs = require('fs-extra');
const MongoClient = require('mongodb').MongoClient;
const mail = require(__dirname + '/../libs/mail');

if (!I_REALLY_WANT_TO_DO_THIS) {
	console.log('Are you sure you really want to do this? Set `I_REALLY_WANT_TO_DO_THIS` to true.');
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
			sendEmail(0);
			function sendEmail(i) {
				if (i < userDocs.length) {
					const userDoc = userDocs[i];
					// Make sure we haven't already sent user the email
					if (typeof blacklist[userDoc.user] === 'undefined'
							&& (!DEBUG || (DEBUG && debugList.includes(userDoc.user)))) {

						const email = userDoc.user + '@micds.org';
						const emailReplace = {
							firstName: userDoc.firstName
						};

						console.log(`Sending email for ${userDoc.user}...`);
						mail.sendHTML(email, subject, messageDir, emailReplace, () => {
							console.log(`Email for ${userDoc.user} sent!`);
							blacklistUser(userDoc.user, err => {
								if (err) throw err;
								setTimeout(() => {
									sendEmail(++i);
								});
							});
						});
					} else {
						console.log(`User ${userDoc.user} is already in blacklist. Skipping.`);
						sendEmail(++i);
					}
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
