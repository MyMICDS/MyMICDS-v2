'use strict';

/**
 * @file Manages the fetching and parsing of Daily Bulletins.
 * @module dailyBulletin
 */
const config = require(__dirname + '/config.js');

const _         = require('underscore');
const fs        = require('fs-extra');
const path      = require('path');
const utils     = require(__dirname + '/utils.js');


const PDFParser = require('pdf2json');
const wordArray = [
	'activities',
	'lunch',
	'schedule',
	'advisory',
	'collab',
	'period',
	'dismissal'
]

let pdfParser = new PDFParser();


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
 * Parses the daily bulletin
 * @function getPDFJSON
 * @param {filename} filename - the name of the file (withought .pdf)
 * @param {callback} callback = Callback
*/

/**
 * Returns an error if any
 * @callback getPDFJSONCallback
 * @param {Object} error - the error message
 * @param {Object} validWords - valid words extracted
 * @param {Object} parsed - the raw parsed content
 * @param {Object} actual - JSON Object with final parsed content
 */

 function getPDFJSON(filename, callback) {		 
 	let path = bulletinPDFDir + '/' + filename + '.pdf'
		 
	pdfParser.on("pdfParser_dataError", err => {
		callback("Error with getting the file");
	});
	
	pdfParser.on("pdfParser_dataReady", success => {
		let parsed = JSON.parse(JSON.stringify(success));
		
		let validWords = [];
		
		let actual = {
			"birthday" : null,
			"dismissal" : null,
			"formalDress" : false,
			"announcement" : null,
			"schedule" : null
		};
		
		let index = 0;
		for (var key in parsed.formImage.Pages[0].Texts) {
			if (parsed.formImage.Pages[0].Texts.hasOwnProperty(key)) {
				// valid JSON key
				
				for (var word in wordArray) {
					if (parsed.formImage.Pages[0].Texts[index].R[0].T.toString().includes(word)) {
						validWords.push(parsed.formImage.Pages[0].Texts[index].R[0].T);
						break;
					}
				}
			}
			
			index++;
		}
		
		// deconde the URL stuff
		for (let real = 0; real < validWords.length; real++) {
			validWords[real] = decodeURIComponent(validWords[real]);
		}
		
		index = 0;
		validWords.forEach((word) => {
			if (word.toString().search(/Happy Birthday/g) > -1) {
				actual.birthday = word;
			}
			else if (word.toString().search(/DISMISSAL/g) > -1) {
				actual.dismissal = validWords[index + 4];
			}
			else if (word.toString().search(/FORMAL DRESS/) > -1) {
				actual.formalDress = true;
			}
			else if (word.toString().search(/3:15/) > -1) {
				validWords[index] += ' stop';
			}
			
			index++;
		});
		
		// parse the schedule		
		let scheduleRaw = [];
		for (var counter = 9; counter < validWords.length; counter++) {
			if (validWords[counter].toString().search(/stop/) > -1) {
				scheduleRaw.push(validWords[counter].replace('stop', ''));
				break;
			}
			else {
				scheduleRaw.push(validWords[counter]);
			}
		}
		
		actual.schedule = scheduleRaw.join('\n');
		
		actual.announcement = validWords[8];
		
		callback(null, validWords, parsed, actual);
	});
	
	pdfParser.loadPDF(path);
 }


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
 
function queryLatest(callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	// Get Google Service Account
	googleServiceAccount.create((err, jwtClient) => {
		if(err) {
			callback(err);
			return;
		}

		// Get list of messages
		gmail.users.messages.list({
			auth: jwtClient,
			userId: 'me',
			q: query
		}, (err, messageList) => {
			if(err) {
				callback(new Error('There was a problem listing the messages from Gmail!'));
				return;
			}

			// Get the most recent email id
			const recentMsgId = messageList.messages[0].id;

			// Now get details on most recent email
			gmail.users.messages.get({
				auth: jwtClient,
				userId: 'me',
				id: recentMsgId
			}, (err, recentMessage) => {
				if(err) {
					callback(new Error('There was a problem getting the most recent email!'));
					return;
				}

				// Search through the email for any PDF
				const parts = recentMessage.payload.parts;
				let attachmentId = null;
				let originalFilename = null;
				for(const part of parts) {
					// If part contains PDF attachment, we're done boys.
					if(part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
						attachmentId = part.body.attachmentId;
						originalFilename = path.parse(part.filename);
						break;
					}
				}

				if(attachmentId === null) {
					callback(new Error('The most recent Daily Bulletin email did not contain any PDF attachment!'));
					return;
				}

				// Get PDF attachment with attachment id
				gmail.users.messages.attachments.get({
					auth: jwtClient,
					userId: 'me',
					messageId: recentMsgId,
					id: attachmentId
				}, (err, attachment) => {
					if(err) {
						callback(new Error('There was a problem getting the PDF attachment!'));
						return;
					}

					// PDF Contents
					const pdf = Buffer.from(attachment.data, 'base64');
					// Parse base filename to date
					const bulletinDate = new Date(originalFilename.name);


					// Get PDF name
					const bulletinName = bulletinDate.getFullYear()
						+ '-' + utils.leadingZeros(bulletinDate.getMonth() + 1)
						+ '-' + utils.leadingZeros(bulletinDate.getDate());

					// Make sure directory for Daily Bulletin exists
					fs.ensureDir(bulletinPDFDir, err => {
						if(err) {
							callback(new Error('There was a problem ensuring directory for Daily Bulletins!'));
							return;
						}

						// Write PDF to file
						fs.writeFile(bulletinPDFDir + '/' + bulletinName + '.pdf', pdf, err => {
							if(err) {
								callback(new Error('There was a problem writing the PDF!'));
								return;
							}

							callback(null);
						});
					});
				});
			});
		});
	});
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

function queryAll(callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	console.log('Trying to query all the Daily Bulletins in existence. This may take a bit of time...');
	googleServiceAccount.create((err, jwtClient) => {
		if(err) {
			callback(err);
			return;
		}

		// Array to store all message ids
		console.log('Get Daily Bulletin message ids...');
		let messageIds = [];

		function getPage(nextPageToken) {
			const listQuery = {
				auth: jwtClient,
				userId: 'me',
				maxResults: 200,
				q: query
			};
			if(typeof nextPageToken === 'string') {
				listQuery.pageToken = nextPageToken;
			}

			gmail.users.messages.list(listQuery, (err, messageList) => {
				if(err) {
					callback(new Error('There was a problem listing the messages from Gmail!'));
					return;
				}

				// Add message ids to array
				messageIds = messageIds.concat(messageList.messages);

				// If there is a next page, get it
				if(typeof messageList.nextPageToken === 'string') {
					console.log('Get next page with token ' + messageList.nextPageToken);
					getPage(messageList.nextPageToken);
				} else {
					// We got all the pages!
					// We start with the last so newer bulletins will override older ones if multiple emails were sent.
					// Create a batch so we can send up to 100 requests at once
					const batch = new googleBatch();
					batch.setAuth(jwtClient);

					// Array to store all the email information
					let getMessages = [];

					console.log('Get detailed information about messages...');
					const addMessageToBatch = (i, inBatch) => {
						if(i >= 0) {
							// Add to batch
							const messageId = messageIds[i].id;
							const params = {
								googleBatch: true,
								userId: 'me',
								id: messageId
							};

							batch.add(gmail.users.messages.get(params));
							inBatch++;

							// If there are 100 queries in Batch request, query it.
							if(inBatch === 100) {
								batch.exec((err, responses) => {
									getMessages = getMessages.concat(responses);
									batch.clear();
									addMessageToBatch(--i, 0);
								});
							} else {
								addMessageToBatch(--i, inBatch);
							}
						} else {
							// Finished making batch requests
							// Execute the remaining of the API requests in the batch
							batch.exec((err, responses) => {
								getMessages = getMessages.concat(responses);
								batch.clear();
								console.log('Got ' + getMessages.length + ' emails containing Daily Bulletins');

								// Now that we're all done getting information about the email, make an array of all the attachments.
								const attachments = [];
								// Array containing filenames matching the indexes of the attachments array
								const attachmentIdFilenames = [];

								// Search through the emails for any PDF
								for(const response of getMessages) {
									const parts = response.body.payload.parts;

									// Loop through parts looking for a PDF attachment
									for(const part of parts) {
										// If part contains PDF attachment, append attachment id and filename to arrays.
										if(part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
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
								function addAttachmentToBatch(l, inBatch) {
									if(l < attachments.length) {
										// Add attachment to batch
										const attachment = attachments[l];
										const params = {
											googleBatch: true,
											userId: 'me',
											messageId: attachment.emailId,
											id: attachment.attachmentId
										};

										batch.add(gmail.users.messages.attachments.get(params));
										inBatch++;

										if(inBatch === 100) {
											batch.exec((err, responses) => {
												dailyBulletins = dailyBulletins.concat(responses);
												batch.clear();
												addAttachmentToBatch(++l, 0);
											});
										} else {
											addAttachmentToBatch(++l, inBatch);
										}

									} else {
										// Finished getting attachments
										// Execute the remaining of the API requests in the batch
										batch.exec((err, responses) => {
											dailyBulletins = dailyBulletins.concat(responses);
											batch.clear();

											// Finally, write all the Daily Bulletins to the proper directory
											console.log('Writing Daily Bulletins to file...');

											// Make sure directory for Daily Bulletin exists
											fs.ensureDir(bulletinPDFDir, err => {
												if(err) {
													callback(new Error('There was a problem ensuring directory for Daily Bulletins!'));
													return;
												}

												function writeBulletin(m) {
													if(m < dailyBulletins.length) {
														const dailyBulletin = dailyBulletins[m];

														// PDF contents
														const pdf = Buffer.from(dailyBulletin.body.data, 'base64');
														// We must now get the filename of the Daily Bulletin
														const originalFilename = path.parse(attachmentIdFilenames[m]);
														// Parse base filename to date
														const bulletinDate = new Date(originalFilename.name);

														// If not valid date, it isn't the Daily Bulletin
														if(_.isNaN(bulletinDate.getTime())) {
															writeBulletin(++m);
															return;
														}

														// Get PDF name
														const bulletinName = bulletinDate.getFullYear()
															+ '-' + utils.leadingZeros(bulletinDate.getMonth() + 1)
															+ '-' + utils.leadingZeros(bulletinDate.getDate())
															+ '.pdf';

														// Write PDF to file
														fs.writeFile(bulletinPDFDir + '/' + bulletinName, pdf, err => {
															if(err) {
																callback(new Error('There was a problem writing the PDF!'));
																return;
															}

															writeBulletin(++m);

														});
													} else {
														// All done writing Daily Bulletins!
														console.log('Done!');
														callback(null);
													}
												}
												writeBulletin(0);

											});
										});
									}
								}
								addAttachmentToBatch(0, 0);

							});
						}
					};
					addMessageToBatch(messageIds.length - 1, 0);

				}
			});
		}
		getPage();

	});

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

function getList(callback) {
	if(typeof callback !== 'function') return;

	// Read directory
	fs.ensureDir(bulletinPDFDir, err => {
		if(err) {
			callback(new Error('There was a problem ensuring the bulletin directory exists!'), null);
			return;
		}

		fs.readdir(bulletinPDFDir, (err, files) => {
			if(err) {
				callback(new Error('There was a problem reading the bulletin directory!'), null);
				return;
			}

			// Only return files that are a PDF
			const bulletins = [];
			for(const _file of files) {
				const file = path.parse(_file);
				if(file.ext === '.pdf') {
					bulletins.push(file.name);
				}
			}

			// Sort bulletins to get most recent
			bulletins.sort();
			bulletins.reverse();

			callback(null, bulletins);

		});
	});
}

module.exports.baseURL     = dailyBulletinUrl;
module.exports.queryLatest = queryLatest;
module.exports.queryAll    = queryAll;
module.exports.getList     = getList;
module.exports.getPDFJSON  = getPDFJSON; 