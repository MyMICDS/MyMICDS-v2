'use strict';

/**
 * @file Manages the fetching and parsing of Daily Bulletins.
 * @module dailyBulletin
 */
const config = require(__dirname + '/config.js');

const _     = require('underscore');
const fs    = require('fs-extra');
const path  = require('path');
const utils = require(__dirname + '/utils.js');

const { promisify } = require('util');

const googleServiceAccount = require(__dirname + '/googleServiceAccount.js');
const googleBatch          = require('google-batch');
const google               = googleBatch.require('googleapis');
const gmail                = google.gmail('v1');

// Where public accesses backgrounds
const dailyBulletinUrl = config.hostedOn + '/daily-bulletin';
// Where to save Daily Bulletin PDFs
const bulletinPDFDir = __dirname + '/../public/daily-bulletin';
// Query to retrieve emails from Gmail
const query = 'label:us-daily-bulletin';

/**
 * Gets the most recent Daily Bulletin from Gmail and writes it to the bulletin directory
 * @function queryLatest
 * @param {queryLatestCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback queryLatestCallback
 * @param {Object} err - Null if success, error object if failure.
 */

async function queryLatest() {
	// Get Google Service Account
	const jwtClient = await googleServiceAccount.create();

	// Get list of messages
	let messageList;
	try {
		messageList = await promisify(gmail.users.messages.list)({
			auth: jwtClient,
			userId: 'me',
			q: query
		});
	} catch (e) {
		throw new Error('There was a problem listing the messages from Gmail!');
	}

	// Get the most recent email id
	const recentMsgId = messageList.messages[0].id;

	// Now get details on most recent email
	let recentMessage;
	try {
		recentMessage = await promisify(gmail.users.messages.get)({
			auth: jwtClient,
			userId: 'me',
			id: recentMsgId
		});
	} catch (e) {
		throw new Error('There was a problem getting the most recent email!');
	}

	// Search through the email for any PDF
	const parts = recentMessage.payload.parts;
	let attachmentId = null;
	let originalFilename = null;
	for (const part of parts) {
		// If part contains PDF attachment, we're done boys.
		if (part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
			attachmentId = part.body.attachmentId;
			originalFilename = path.parse(part.filename);
			break;
		}
	}

	if (attachmentId === null) throw new Error('The most recent Daily Bulletin email did not contain any PDF attachment!');

	// Get PDF attachment with attachment id
	let attachment;
	try {
		attachment = await promisify(gmail.users.messages.attachments.get)({
			auth: jwtClient,
			userId: 'me',
			messageId: recentMsgId,
			id: attachmentId
		});
	} catch (e) {
		throw new Error('There was a problem getting the PDF attachment!');
	}

	// PDF Contents
	const pdf = Buffer.from(attachment.data, 'base64');
	// Get PDF name
	const bulletinName = parseFilename(originalFilename.name);

	// If bulletinName is null, we are unable to parse bulletin and should skip
	// This probably means it's not a bulletin
	if (!bulletinName) return;

	// Make sure directory for Daily Bulletin exists
	try {
		await promisify(fs.ensureDir)(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem ensuring directory for Daily Bulletins!');
	}

	// Write PDF to file
	try {
		await promisify(fs.writeFile)(bulletinPDFDir + '/' + bulletinName, pdf);
	} catch (e) {
		throw new Error('There was a problem writing the PDF!');
	}
}

/**
 * Goes through all of the Daily Bulletins and writes them to file.
 * @function queryAll
 * @callback {queryAllCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback queryAllCallback
 * @param {Object} err - Null if success, error object if failure.
 */

async function queryAll() {
	console.log('Trying to query all the Daily Bulletins in existence. This may take a bit of time...');

	const jwtClient = await googleServiceAccount.create();

	// Array to store all message ids
	console.log('Get Daily Bulletin message ids...');
	let messageIds = [];

	async function getPage(nextPageToken) {
		const listQuery = {
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
			messageList = await promisify(gmail.users.messages.list)(listQuery);
		} catch (e) {
			throw new Error('There was a problem listing the messages from Gmail!');
		}

		// Add message ids to array
		messageIds = messageIds.concat(messageList.messages);

		// If there is a next page, get it
		if (typeof messageList.nextPageToken === 'string') {
			console.log('Get next page with token ' + messageList.nextPageToken);
			await getPage(messageList.nextPageToken);
		} else {
			// We got all the pages!
			// We start with the last so newer bulletins will override older ones if multiple emails were sent.
			// Create a batch so we can send up to 100 requests at once
			const batch = new googleBatch();
			batch.setAuth(jwtClient);

			// Array to store all the email information
			let getMessages = [];

			console.log('Get detailed information about messages...');

			let inFirstBatch = 0;
			for (const messageId of messageIds.reverse()) {
				const params = {
					googleBatch: true,
					userId: 'me',
					id: messageId
				};

				batch.add(gmail.users.messages.get(params));
				inFirstBatch++;

				// If there are 100 queries in Batch request, query it.
				if (inFirstBatch === 100) {
					const responses = await promisify(batch.exec)();
					getMessages = getMessages.concat(responses);

					batch.clear();
					inFirstBatch = 0;
				}
			}

			// Finished making batch requests
			// Execute the remaining of the API requests in the batch
			const firstResponses = await promisify(batch.exec)();
			getMessages = getMessages.concat(firstResponses);
			batch.clear();
			console.log('Got ' + getMessages.length + ' emails containing Daily Bulletins');

			// Now that we're all done getting information about the email, make an array of all the attachments.
			const attachments = [];
			// Array containing filenames matching the indexes of the attachments array
			const attachmentIdFilenames = [];

			// Search through the emails for any PDF
			for (const response of getMessages) {
				const parts = response.body.payload.parts;

				// Loop through parts looking for a PDF attachment
				for (const part of parts) {
					// If part contains PDF attachment, append attachment id and filename to arrays.
					if (part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
						const attachmentId = part.body.attachmentId;
						attachments.push({
							emailId: response.body.id,
							attachmentId: attachmentId
						});
						attachmentIdFilenames.push(part.filename);
						break;
					}
				}
			}

			// Finally, make batch requests to get the actual PDF attachments
			console.log('Downloading Daily Bulletins...');
			let dailyBulletins = [];

			let inSecondBatch = 0;
			for (const attachment of attachments) {
				const params = {
					googleBatch: true,
					userId: 'me',
					messageId: attachment.emailId,
					id: attachment.attachmentId
				};

				batch.add(gmail.users.messages.attachments.get(params));
				inSecondBatch++;

				if (inSecondBatch === 100) {
					const responses = await promisify(batch.exec)();
					dailyBulletins = dailyBulletins.concat(responses);

					batch.clear();
					inSecondBatch = 0;
				}
			}

			// Finished getting attachments
			// Execute the remaining of the API requests in the batch
			const secondResponses = await promisify(batch.exec)();
			dailyBulletins = dailyBulletins.concat(secondResponses);
			batch.clear();

			// Finally, write all the Daily Bulletins to the proper directory
			console.log('Writing Daily Bulletins to file...');

			// Make sure directory for Daily Bulletin exists
			try {
				await promisify(fs.ensureDir)(bulletinPDFDir);
			} catch (e) {
				throw new Error('There was a problem ensuring directory for Daily Bulletins!');
			}

			for (let i = 0; i < dailyBulletins.length; i++) {
				const dailyBulletin = dailyBulletins[i];
				// PDF contents
				const pdf = Buffer.from(dailyBulletin.body.data, 'base64');
				// We must now get the filename of the Daily Bulletin
				const originalFilename = path.parse(attachmentIdFilenames[i]);
				// Get PDF name
				const bulletinName = parseFilename(originalFilename.name);

				// If bulletinName is null, we are unable to parse bulletin and should skip
				// This probably means it's not a bulletin
				if (!bulletinName) continue;

				// Write PDF to file
				try {
					await promisify(fs.writeFile)(bulletinPDFDir + '/' + bulletinName, pdf);
				} catch (e) {
					throw new Error('There was a problem writing the PDF!');
				}
			}

			console.log('Done!');
		}
	}

	return getPage();
}

/**
 * Returns an array of the Daily Bulletin names in the Daily Bulletin directory.
 * @function getList
 * @param {getListCallback} callback - Callback
 */

/**
 * Returns an array of bulletin names (without extention) from newest to oldest
 * @callback getListCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} bulletins - Array of bulletins from newest to oldest. Null if error.
 */

async function getList() {
	// Read directory
	try {
		await promisify(fs.ensureDir)(bulletinPDFDir)();
	} catch (e) {
		throw new Error('There was a problem ensuring the bulletin directory exists!');
	}

	let files;
	try {
		files = await promisify(fs.readdir)(bulletinPDFDir);
	} catch (e) {
		throw new Error('There was a problem reading the bulletin directory!');
	}

	// Only return files that are a PDF
	const bulletins = [];
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
 * Return MyMICDS filename (including extension) from parsing email attachment filename. Returns null if unable to parse.
 * @param {string} filename - Name of file
 * @returns {string}
 */

function parseFilename(filename) {
	const cleanedName = /([0-9]+.)+[0-9]+/.exec(filename);
	if (!cleanedName || !cleanedName[0]) {
		return null;
	}
	const date = new Date(cleanedName[0]);
	if (_.isNaN(date.getTime())) {
		return null;
	}
	return `${utils.leadingZeros(date.getFullYear())}-${utils.leadingZeros(date.getMonth() + 1)}-${utils.leadingZeros(date.getDate())}.pdf`;
}

module.exports.baseURL     = dailyBulletinUrl;
module.exports.queryLatest = queryLatest;
module.exports.queryAll    = queryAll;
module.exports.getList     = getList;
