import * as fs from 'fs-extra';
import { gmail_v1, google } from 'googleapis';
import moment from 'moment';
import pAll from 'p-all';
import * as path from 'path';
import * as _ from 'underscore';
import config from './config';
import * as googleServiceAccount from './googleServiceAccount';
import * as utils from './utils';

const gmail = google.gmail('v1');

// Where public accesses backgrounds
export const baseURL = config.hostedOn + '/daily-bulletin';
// Where to save Daily Bulletin PDFs
export const bulletinPDFDir = __dirname + '/../public/daily-bulletin';
// Query to retrieve emails from Gmail
const query = 'label:us-daily-bulletin';

// Options passed into pAll.
const pAllOptions = {
	// How many requests should be pending at a time.
	concurrency: 50
};

/**
 * Retrieves the most recent Daily Bulletin from Gmail and saves it to the bulletin directory.
 */
export async function queryLatest() {
	// Get Google Service Account
	const jwtClient = await googleServiceAccount.create();

	// Get list of messages
	let messageList;
	try {
		messageList = await gmail.users.messages.list({
			auth: jwtClient,
			userId: 'me',
			q: query
		}).then(r => r.data);
	} catch (e) {
		throw new Error('There was a problem listing the messages from Gmail!');
	}

	// Get the most recent email id
	const recentMsgId = messageList.messages![0].id;

	// Now get details on most recent email
	let recentMessage;
	try {
		recentMessage = await gmail.users.messages.get({
			auth: jwtClient,
			userId: 'me',
			id: recentMsgId
		}).then(r => r.data);
	} catch (e) {
		throw new Error('There was a problem getting the most recent email!');
	}

	// Search through the email for any PDF
	const parts = recentMessage.payload!.parts!;
	let attachmentId: string | null = null;
	let originalFilename: path.ParsedPath | null = null;
	for (const part of parts) {
		// If part contains PDF attachment, we're done boys.
		if (part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
			attachmentId = part.body!.attachmentId!;
			originalFilename = path.parse(part.filename!);
			break;
		}
	}

	if (attachmentId === null) {
		throw new Error('The most recent Daily Bulletin email did not contain any PDF attachment!');
	}

	// Get PDF attachment with attachment id
	let attachment;
	try {
		attachment = await gmail.users.messages.attachments.get({
			auth: jwtClient,
			userId: 'me',
			messageId: recentMsgId,
			id: attachmentId
		}).then(r => r.data);
	} catch (e) {
		throw new Error('There was a problem getting the PDF attachment!');
	}

	// PDF Contents
	const pdf = Buffer.from(attachment.data!, 'base64');
	// Get PDF name
	const bulletinName = generateFilename(originalFilename!.name, new Date(parseInt(recentMessage.internalDate!, 10)));

	// If bulletinName is null, we are unable to parse bulletin and should skip
	// This probably means it's not a bulletin
	if (!bulletinName) { return; }

	// Make sure directory for Daily Bulletin exists
	try {
		await fs.ensureDir(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem ensuring directory for Daily Bulletins!');
	}

	// Write PDF to file
	try {
		await fs.writeFile(bulletinPDFDir + '/' + bulletinName, pdf);
	} catch (e) {
		throw new Error('There was a problem writing the PDF!');
	}
}

/**
 * Gets every single Daily Bulletin and writes them to disk.
 */
export async function queryAll() {
	// tslint:disable:no-console
	console.log('Trying to query all the Daily Bulletins in existence. This may take a bit of time...');

	const jwtClient = await googleServiceAccount.create();

	// Array to store all message ids
	console.log('Getting Daily Bulletin message ids...');
	const messageIds: string[] = [];

	let nextPageToken: string | undefined;
	do {
		const listQuery: gmail_v1.Params$Resource$Users$Messages$List = {
			auth: jwtClient,
			userId: 'me',
			maxResults: 200,
			q: query
		};
		if (typeof nextPageToken === 'string') {
			listQuery.pageToken = nextPageToken;
		}

		let messageList;
		try {
			messageList = await gmail.users.messages.list(listQuery).then(r => r.data);
		} catch (e) {
			throw new Error('There was a problem listing the messages from Gmail!');
		}

		// Add message ids to array
		messageIds.push(...messageList.messages!.map(m => m.id!));

		nextPageToken = messageList.nextPageToken;
	} while (typeof nextPageToken === 'string');

	// We got all the pages!
	// We start with the last so newer bulletins will override older ones if multiple emails were sent.

	const getMessagesActions = messageIds.reverse().map(messageId => {
		const params: gmail_v1.Params$Resource$Users$Messages$Get = {
			auth: jwtClient,
			userId: 'me',
			id: messageId
		};

		return () => gmail.users.messages.get(params).then(r => r.data);
	});

	console.log(`Getting detailed information about ${messageIds.length} messages...`);

	console.time('get messages');
	const getMessages = await pAll(getMessagesActions, pAllOptions);
	console.timeEnd('get messages');
	console.log(`Got ${getMessages.length} emails containing Daily Bulletins`);

	// Now that we're all done getting information about the email, make an array of all the attachments.
	const attachments: Array<{ emailId: string, attachmentId: string }>  = [];
	// Array containing filenames matching the indexes of the attachments array
	const attachmentIdFilenames: string[] = [];
	// Array containing dates matching the indexes of the attachments array
	const sentDates: Date[] = [];

	// Search through the emails for any PDF
	for (const response of getMessages) {
		const parts = response.payload!.parts!;

		// Loop through parts looking for a PDF attachment
		for (const part of parts) {
			// If part contains PDF attachment, append attachment id and filename to arrays.
			if (part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
				const attachmentId = part.body!.attachmentId!;
				attachments.push({
					emailId: response.id!,
					attachmentId
				});
				attachmentIdFilenames.push(part.filename!);
				sentDates.push(new Date(parseInt(response.internalDate!, 10)));
				break;
			}
		}
	}

	// Finally, make batch requests to get the actual PDF attachments
	console.log('Downloading Daily Bulletins...');

	const getAttachmentsActions = attachments.map(attachment => {
		const params: gmail_v1.Params$Resource$Users$Messages$Attachments$Get = {
			auth: jwtClient,
			userId: 'me',
			messageId: attachment.emailId,
			id: attachment.attachmentId
		};

		return () => gmail.users.messages.attachments.get(params).then(r => r.data);
	});

	console.time('download bulletins');
	const dailyBulletins = await pAll(getAttachmentsActions, pAllOptions);
	console.timeEnd('download bulletins');

	// Finally, write all the Daily Bulletins to the proper directory
	console.log('Writing Daily Bulletins to file...');

	// Make sure directory for Daily Bulletin exists
	try {
		await fs.ensureDir(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem ensuring directory for Daily Bulletins!');
	}

	await Promise.all(dailyBulletins.map(async (dailyBulletin, i) => {
		// PDF contents
		const pdf = Buffer.from(dailyBulletin.data!, 'base64');
		// We must now get the filename of the Daily Bulletin
		const originalFilename = path.parse(attachmentIdFilenames[i]);
		// Get PDF name
		const bulletinName = generateFilename(originalFilename.name, sentDates[i]);

		// If bulletinName is null, we are unable to parse bulletin and should skip
		// This probably means it's not a bulletin
		if (!bulletinName) { return; }

		// Write PDF to file
		try {
			await fs.writeFile(bulletinPDFDir + '/' + bulletinName, pdf);
		} catch (e) {
			throw new Error('There was a problem writing the PDF!');
		}
	}));

	console.log('Done!');
	// tslint:enable:no-console
}

/**
 * Gets the locations of all the Daily Bulletins on disk.
 * @returns A list of bulletin filenames from newest to oldest.
 */
export async function getList() {
	// Read directory
	try {
		await fs.ensureDir(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem ensuring the bulletin directory exists!');
	}

	let files: string[];
	try {
		files = await fs.readdir(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem reading the bulletin directory!');
	}

	// Only return files that are a PDF
	const bulletins: string[] = [];
	for (const _file of files) {
		const file = path.parse(_file);
		if (file.ext === '.pdf') {
			bulletins.push(file.name);
		}
	}

	// Sort bulletins to get most recent
	bulletins.sort();
	bulletins.reverse();

	return bulletins;
}

/**
 * Turns an email attachment filename into a MyMICDS filename.
 * @param filename Email attachment filename.
 * @param sentDate Date when the email was sent.
 * @returns Filename to save bulletin as.
 */
function generateFilename(filename: string, sentDate: Date): string | null {
	let date;

	// Calise format
	const caliseFilename = /([0-9]+.)+[0-9]+/.exec(filename);
	if (!caliseFilename || !caliseFilename[0]) {
		// O'Brien format
		const obrienFilename = /[A-Za-z]+, ([A-Za-z]+) ([0-9]+)/.exec(filename);
		if (!obrienFilename) {
			return null;
		}

		date = moment(`${obrienFilename[1]} ${obrienFilename[2]}`, 'MMMM D').toDate();
	} else {
		date = new Date(caliseFilename[0]);
	}

	date.setFullYear(sentDate.getFullYear());

	if (_.isNaN(date.getTime())) {
		return null;
	}

	const [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(utils.leadingZeros);

	return `${year}-${month}-${day}.pdf`;
}
