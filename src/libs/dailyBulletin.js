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
];

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
	let pdfParser = new PDFParser();
 	let path = bulletinPDFDir + '/' + filename + '.pdf'
		 
	pdfParser.once("pdfParser_dataError", err => {
		callback("Error with getting the file", null, null, null);
	});
	
	pdfParser.once("pdfParser_dataReady", success => {
		let parsed = JSON.parse(JSON.stringify(success));
		
		let validWords = [];
		
		let actual = {
			"birthday" : null,
			"dismissal" : null,
			"formalDress" : false,
			"announcement" : null,
			"schedule" : null
		};
		
		/* preprocessing */
		for (var page = 0; page < parsed.formImage.Pages.length; page++) {
			var index = 0;
			for (var key in parsed.formImage.Pages[page].Texts) {
				if (parsed.formImage.Pages[page].Texts.hasOwnProperty(key)) {
					// valid JSON key
					for (var word in wordArray) {
						if (parsed.formImage.Pages[page].Texts[index].R[0].T.toString().includes(word)) {
							validWords.push(parsed.formImage.Pages[page].Texts[index].R[0].T);
							break;
						}
					}
				}
				
				index++;
			}
		}
		
		// deconde the URL stuff
		for (let real = 0; real < validWords.length; real++) {
			validWords[real] = decodeURIComponent(validWords[real]);
		}
		
		/* processing */
		index = 0;
		validWords.forEach((word) => {
			if (word.toString().search(/DISMISSAL/) > -1 || word.toString().search(/TRIP/) > -1) {
				actual.dismissal = validWords[index + 4];
			}
			else if (word.toString().search(/FORMAL/) > -1) {
				actual.formalDress = true;
			}
			else if (word.toString().search(/SCHEDULE/) > -1) {
				validWords[index] += ' start';
			}
			else if (word.toString().search(/3:15/) > -1 || word.toString().search(/11:30/) > -1) {
				validWords[index + 1] += ' stop';
			}
			
			index++;
		});
		
		/* postprocessing */
		
		// parse the schedule		
		let scheduleRaw = [];
		let startIndex = 0; // 9 should be default
		for (var c = startIndex; c < validWords.length; c++) {
			if (validWords[c].toString().search(/start/) > -1) {
				startIndex++;
				break;
			}
			else {
				startIndex++;
			}
		}
		
		for (var counter = startIndex; counter < validWords.length; counter++) {
			if (validWords[counter].toString().search(/stop/) > -1) {
				scheduleRaw.push(validWords[counter].replace('stop', ''));
				break;
			}
			else {
				scheduleRaw.push(validWords[counter]);
			}
		}
		
		actual.schedule = scheduleRaw.join('|');
		
		actual.announcement = validWords[8];
		
		// build birthdays
		let birthdayRaw = [];
		let foundBirthdayPos = false;
		validWords.forEach((word) => {
			if (word.search(/Birthday/) > -1 || word.search(/birthday/) > -1) {
				birthdayRaw.push(word);
				foundBirthdayPos = true;
			}
			else if (foundBirthdayPos) {
				birthdayRaw.push(word);
			}
		});
		actual.birthday = birthdayRaw.join('');

		// TODO build the dismissals (setting null for now)
		actual.dismissal = null;
		
		// format the birhtdays
		const conjunctions = [
			"and",
			"but",
			",",
			"Sunday",
			"Saturday",
			"Friday",
			"Monday"
		];
		
		conjunctions.forEach((fanboy) => {
			if (fanboy == ",") {
				actual.birthday = actual.birthday.split(fanboy).join(' ');
			}
			else {
				actual.birthday = actual.birthday.split(fanboy).join('');
			}
		});
		
		actual.birthday = actual.birthday.split("Birthday").join('');
		actual.birthday = actual.birthday.split("Happy").join('');
		actual.birthday = actual.birthday.split('  ');
		
		for (var s = 0; s < actual.birthday.length; s++) {
			if (actual.birthday[s].search(/\bto/) > -1) {
				actual.birthday[s] = actual.birthday[s].substring(3, actual.birthday[s].length);
			}
		}
		
		var birthdayFormat = [];
		
		for (var space = 0; space < actual.birthday.length; space++) {
			if (actual.birthday[space].length >= 1) {
				birthdayFormat.push(actual.birthday[space]);
			}
		}
		
		for (var char = 0; char < birthdayFormat.length; char++) {
			if (birthdayFormat[char].charAt(' ')) {
				var split = birthdayFormat[char].split('');
				if (split[0].includes(' ')) {
					split[0] = '';
				}
				birthdayFormat[char] = split.join('');
			}
		}
		
		actual.birthday = birthdayFormat;
		
		/* postprocess the schedule */
		actual.schedule = actual.schedule.split('|');
		
		var scheduleFormat = [];
		
		for (var i = 1; i < actual.schedule.length; i++) {
			if (isNaN(actual.schedule[i].charAt(0)) || actual.schedule[i].search(/Assembly/) > -1) {
				var template = {
					"block" : null,
					"start" : null,
					"end" : null
				}
				
				template.block = actual.schedule[i];
				var time = actual.schedule[i - 1].split(' – ');
				template.start = time[0];
				template.end = time[1];
								
				scheduleFormat.push(template);
			}
		}
		
		actual.schedule = scheduleFormat;
		
		// validate the data
		if (actual.announcement.length <= 13) {
			actual.announcement = null;
		}
		//callback(null, validWords, parsed, actual);
		if (actual.schedule == null || actual.schedule == '\\' || actual.schedule == '') {
			callback("unreliable data", validWords, parsed, null);
		}
		else {
			callback(null, validWords, parsed, actual);
		}
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
				let parts = recentMessage.payload.parts;
				let attachmentId = null;
				let originalFilename = null;
				for(let part of parts) {
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
			let listQuery = {
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
					let batch = new GoogleBatch();
					batch.setAuth(jwtClient);

					// Array to store all the email information
					let getMessages = [];

					console.log('Get detailed information about messages...');
					let addMessageToBatch = (i, inBatch) => {
						if(i >= 0) {
							// Add to batch
							let messageId = messageIds[i].id;
							let params = {
								googleBatch: true,
								userId: 'me',
								id: messageId
							};

							batch.add(gmail.users.messages.get(params));
							inBatch++;

							// If there are 100 queries in Batch request, query it.
							if(inBatch === 100) {
								batch.exec((err, responses, errorDetails) => {
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
							batch.exec((err, responses, errorDetails) => {
								getMessages = getMessages.concat(responses);
								batch.clear();
								console.log('Got ' + getMessages.length + ' emails containing Daily Bulletins');

								// Now that we're all done getting information about the email, make an array of all the attachments.
								let attachments = [];
								// Array containing filenames matching the indexes of the attachments array
								let attachmentIdFilenames = [];

								// Search through the emails for any PDF
								for(let response of getMessages) {
									let parts = response.body.payload.parts;

									// Loop through parts looking for a PDF attachment
									for(let part of parts) {
										// If part contains PDF attachment, append attachment id and filename to arrays.
										if(part.mimeType === 'application/pdf' || part.mimeType === 'application/octet-stream') {
											let attachmentId = part.body.attachmentId;
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
										let attachment = attachments[l];
										let params = {
											googleBatch: true,
											userId: 'me',
											messageId: attachment.emailId,
											id: attachment.attachmentId
										};

										batch.add(gmail.users.messages.attachments.get(params));
										inBatch++;

										if(inBatch === 100) {
											batch.exec((err, responses, errorDetails) => {
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
										batch.exec((err, responses, errorDetails) => {
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
														let dailyBulletin = dailyBulletins[m];

														// PDF contents
														let pdf = Buffer.from(dailyBulletin.body.data, 'base64');
														// We must now get the filename of the Daily Bulletin
														let originalFilename = path.parse(attachmentIdFilenames[m]);
														// Parse base filename to date
														let bulletinDate = new Date(originalFilename.name);

														// If not valid date, it isn't the Daily Bulletin
														if(_.isNaN(bulletinDate.getTime())) {
															writeBulletin(++m);
															return;
														}

														// Get PDF name
														let bulletinName = bulletinDate.getFullYear()
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
			let bulletins = [];
			for(let _file of files) {
				let file = path.parse(_file);
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