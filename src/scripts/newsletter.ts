// USE WITH CAUTION

import { MongoClient } from 'mongodb';
import { Scope } from '@mymicds/sdk';
import { UserDoc } from '../libs/users';
import * as fs from 'fs-extra';
import * as mail from '../libs/mail';
import * as nodemailer from 'nodemailer';
import config from '../libs/config';
import moment from 'moment';

const messageType = Scope.ANNOUNCEMENTS;
const subject = 'We need your help!';
const messageDir = __dirname + '/../html/messages/survey.html';
// Path to JSON file to keep track of who's been sent the email already (in case script stops halfway through)
const blacklistPath = __dirname + '/blacklist.json';

// ONLY SET THIS TO TRUE IF YOU KNOW FOR SURE YOU WANNA DO THIS
// Please set to false once you're done using this script
const I_REALLY_WANT_TO_DO_THIS = false;
// Must set `I_REALLY_WANT_TO_DO_THIS` to true. Will limit email recipients to only `debugList`
// Please set to true once you're done using this script
const DEBUG = true;
// const debugList = ['mgira', 'nclifford', 'jcai'];
const debugList = ['mgira'];

if (!Object.values(Scope).includes(messageType)) {
	console.log(`"${messageType}" is an invalid message type! Refer to \`/src/libs/notifications.js\` for list of valid types.`);
	process.exit();
}

if (!DEBUG && !I_REALLY_WANT_TO_DO_THIS) {
	console.log('Are you sure you really want to do this? Set `I_REALLY_WANT_TO_DO_THIS` to true on line 15. Make sure to set back to false before committing.');
	process.exit();
}

// See who we've already sent email to
getBlacklist().then(async blacklist => {
	// Log into email
	const transporter = nodemailer.createTransport(config.email.URI + '/?pool=true');

	// Connect to database
	const client: MongoClient = await MongoClient.connect(config.mongodb.uri);
	const db = client.db();
	const userdata = db.collection<UserDoc>('users');

	// Get all confirmed users that are either teachers or not graduated yet
	const userDocs = await userdata.find({
		confirmed: true,
		$or: [
			{ gradYear: { $gte: 2019 } },
			{ gradYear: null }
		]
	}).toArray();

	const startTime = Date.now();

	function getDuration() {
		const duration = moment.duration(Date.now() - startTime);
		return `${duration.minutes()}:${duration.seconds().toString().padStart(2, '0')}.${duration.milliseconds().toString().padStart(3, '0')}`;
	}

	for (let i = 0; i < userDocs.length; i++) {
		const percent = ((i + 1) / userDocs.length * 100).toFixed(2);
		const userDoc = userDocs[i];

		// If we're in debug mode
		if (DEBUG && !debugList.includes(userDoc.user)) {
			// console.log(`[${getDuration()}] Skipping user ${userDoc.user} because we're in debug mode. ${percent}% complete (${i + 1} / ${userDocs.length})`);
			continue;
		}

		// Make sure we haven't already sent user the email
		if (typeof blacklist[userDoc.user] !== 'undefined') {
			console.log(`[${getDuration()}] Skipping user ${userDoc.user} because they are already in blacklist. ${percent}% complete (${i + 1} / ${userDocs.length})`);
			continue;
		}

		// Make sure user hasn't unsubscribed from these types of things
		// ignore if userDoc.unsubscribed does not exist
		if (userDoc.unsubscribed?.includes('ALL') || userDoc.unsubscribed?.includes(messageType.toUpperCase())) {
			console.log(`[${getDuration()}] Skipping user ${userDoc.user} because they are unsubscribed from these messages. ${percent}% complete (${i + 1} / ${userDocs.length})`);
			continue;
		}

		// Send email
		const email = userDoc.user + '@micds.org';
		const emailReplace = {
			firstName: userDoc.firstName,
			unsubscribeLink: `https://mymicds.net/unsubscribe/${userDoc.user}/${userDoc.unsubscribeHash}?type=${messageType}`
		};
		const startEmailTime = Date.now();
		console.log(`[${getDuration()}] Sending email for ${userDoc.user}...`);
		try {
			await mail.sendHTML(email, subject, messageDir, emailReplace, transporter);
		} catch (err) {
			console.log(`Error sending mail for user ${userDoc.user}! They have not been added to the blacklist.\n`, err, '\n');
			process.exit();
		}

		const emailSendDuration = Date.now() - startEmailTime;
		console.log(`[${getDuration()}] Email for ${userDoc.user} sent! Took ${emailSendDuration} ms. ${percent}% complete (${i + 1} / ${userDocs.length})`);
		await blacklistUser(userDoc.user);
	}

	console.log('All done!');
	process.exit();
}).catch(err => {
	throw err;
});

/**
 * Prevent user from being sent mail
 */

async function blacklistUser(user: string) {
	const blacklist = await getBlacklist();
	blacklist[user] = Date.now();

	await fs.outputJson(blacklistPath, blacklist, { spaces: '\t' });

	return blacklist;
}

/**
 * Get blacklist
 */

async function getBlacklist() {
	await fs.ensureFile(blacklistPath);

	const data = await fs.readFile(blacklistPath, 'utf8');

	let blacklist: { [user: string]: number } = {};
	if (0 < data.length) {
		blacklist = JSON.parse(data);
	}

	return blacklist;
}
