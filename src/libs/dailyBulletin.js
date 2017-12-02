'use strict';

/**
 * @file Manages the fetching and parsing of Daily Bulletins.
 * @module dailyBulletin
 */
const config = require(__dirname + '/config.js');
const PDFParser = require('pdf2json');

const _     = require('underscore');
const fs    = require('fs-extra');
const path  = require('path');
const utils = require(__dirname + '/utils.js');

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
					// Get PDF name
					const bulletinName = parseFilename(originalFilename.name);

					// If bulletinName is null, we are unable to parse bulletin and should skip
					// This probably means it's not a bulletin
					if(!bulletinName) {
						callback(null);
						return;
					}

					// Make sure directory for Daily Bulletin exists
					fs.ensureDir(bulletinPDFDir, err => {
						if(err) {
							callback(new Error('There was a problem ensuring directory for Daily Bulletins!'));
							return;
						}

						// Write PDF to file
						fs.writeFile(bulletinPDFDir + '/' + bulletinName, pdf, err => {
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
														// Get PDF name
														const bulletinName = parseFilename(originalFilename.name);

														// If bulletinName is null, we are unable to parse bulletin and should skip
														// This probably means it's not a bulletin
														if(!bulletinName) {
															writeBulletin(++m);
															return;
														}

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
	if(_.isNaN(date.getTime())) {
		return null;
	}
	return `${utils.leadingZeros(date.getFullYear())}-${utils.leadingZeros(date.getMonth() + 1)}-${utils.leadingZeros(date.getDate())}.pdf`;
}

// return if a url-encoded word is a zero-length space or not
function isZLS(word) {
	return word === '%E2%80%8B' || word === '%E2%80%8B%E2%80%8B';
}

function parseBulletin(path) {
	return new Promise((resolve, reject) => { 

		const pdfParser = new PDFParser();
		
		pdfParser.on('pdfParser_dataError', errData => {
			reject(errData.parserError || errData.data.toString());
		});

		pdfParser.on('pdfParser_dataReady', pdfData => {
			// generate data file for debugging
			fs.writeFile(__dirname + '/results/pdf-test.json', JSON.stringify(pdfData), (err) => {
				if (err) {
					console.log('Error when writing pdf data: ', err);
				}
			});
			const announcements = [];
			const texts = pdfData.formImage.Pages[0].Texts;
			// Get rid of zero-width spaces (not using this because those spaces sometimes have information)
				// .filter(item => {
				// 	let word = item.R[0].T;
				// 	return word !== '%E2%80%8B' && word !== '%E2%80%8B%E2%80%8B' ;
				// });

			let lastTitleItem;
			// Separate bolded titles and normal weight contents
			for (let i = 0; i < texts.length; i++) {
				const item = texts[i];
				const rawWord = item.R[0];
				let word = decodeURIComponent(rawWord.T).trim();

				// If the last and current word is a space then skip, if last is and current isn't then there is an actual sapce before
				const lastItem = i > 0 ? texts[i - 1] : null;
				const lastWord = lastItem ? lastItem.R[0] : null;
				let hasSpaceBefore = false;
				if (!isZLS(rawWord.T)) {
					// if there's a non zero space before the word or its a new line or there is an encoded space char then there is a space
					hasSpaceBefore = lastWord && (
						isZLS(lastWord.T) ||
						item.y !== lastItem.y ||
						lastWord.T.slice(lastWord.T.length - 3, lastWord.T.length) === '%20'
					);
				} else {
					continue;
				}

				// Find of the last word that is not a space
				let j = i;
				let lastItemNotSpace = lastItem;
				while (j > 0 && lastItemNotSpace && isZLS(lastItemNotSpace.R[0].T)) {
					j--;
					lastItemNotSpace = texts[j];
				}

				// If text and previous one are on different lines it might be a new title
				if (!lastItemNotSpace || ((item.y - lastItemNotSpace.y > 0.9))) {

					lastTitleItem = item;
					// A new title
					announcements.push({ title: word, content: '' });

				} else
				// if the word is bolded, or big enough, and previous word is bolded too then 
				if (lastTitleItem.y === item.y && item.x - lastTitleItem.x < lastTitleItem.w * 0.063 && (rawWord.TS[2] === 1 || rawWord.TS[1] > 30)) {

					lastTitleItem = item;
					// Continuation of previous title
					if (hasSpaceBefore) { word = ' ' + word; }
					announcements[announcements.length - 1].title += word;

				} else {

					// Announcement content below the title
					if (hasSpaceBefore) { word = ' ' + word; }
					announcements[announcements.length - 1].content += word;

				}

			}

			const operations = [];
			let dayType = '';
			// Find the type of day it is, like special schedule or turkey train or whatever
			operations.push((i) => {
				const dayTypeRegEx = /DAY [0-9]{1} [-|–]/g;
				if (dayTypeRegEx.test(announcements[i].title)) {
					dayType = announcements[i].title.substring(7, announcements[i].title.length);
				}
			});

			let jeansDay = false;
			// Find the type of day it is, like special schedule or turkey train or whatever
			operations.push((i) => {
				const jeansDayRegEx = /JEANS DAY/ig;
				if (jeansDayRegEx.test(announcements[i].title)) {
					jeansDay = true;
				}
			});

			// Find Birthday section and parse it
			const birthdays = {};
			operations.push((i) => {
				const parseBirthdays = (bDayText) => {
					const nameRegEx = /Birthday to (.*?)(?= Happy|\n)/g;
					const dateRegEx = /Happy(.*?)(?= Birthday|\n)/g;
					let namesRaw = (bDayText + '\n').match(nameRegEx);
					let datesRaw = (bDayText + '\n').match(dateRegEx);
					if (namesRaw && datesRaw) {
						// Get rid of "Birthday to"
						namesRaw = namesRaw.map(s => s.substring(12, s.length));
						// Get rid of "Happy " or "Happy Belated"
						datesRaw = datesRaw.map(s => {
							if (s.match(/belated/ig)) {
								return s.substring(14, s.length);
							} else if (s.match(/Happy /ig)) {
								return s.substring(6, s.length);
							} else {
								return 'Today';
							}
						});
			
						datesRaw.forEach((date, index) => {
							birthdays[date] = namesRaw[index].split(', ');
							// get rid of the "and"
							// birthdays[date].forEach((name) => {
								
							// });
						});
					}
				};

				parseBirthdays(announcements[i].title);
				parseBirthdays(announcements[i].content);
			});

			const cleanAnnouncements = [];
			// Delete Lunch and Schedule and other unnecessarysections
			operations.push((i) => {
				const titleRegEx = /DAILY BULLETIN|DAY [0-6]|TODAY IS A JEANS DAY/ig;
				const lunchRegEx = /LUNCH/g;
				const scheduleRegEx = /schedule|and lunch|[0-9]{1,2}:[0-9]{2}/ig;
				const collabRegEx = /Collaborative/ig;
				const activitiesRegEx = /MeetingSponsorLocation/ig;
				const birthdayRegEx = /Happy Birthday to /ig;
				// console.log(announcements[i], lunchRegEx.test(announcements[i].title) || scheduleRegEx.test(announcements[i].title) || collabRegEx.test(announcements[i].title) || activitiesRegEx.test(announcements[i].content))
				// The content shouldn't be just a few words long (usually)
				if (announcements[i].content.length >= 20) {
					if (!(birthdayRegEx.test(announcements[i].title) || titleRegEx.test(announcements[i].title) || lunchRegEx.test(announcements[i].title) || scheduleRegEx.test(announcements[i].title) || collabRegEx.test(announcements[i].title) || activitiesRegEx.test(announcements[i].content))) {
						cleanAnnouncements.push(announcements[i]);
					}
				}
			});

			// clean colons and spaces
			operations.push((i) => {
				announcements[i].content = announcements[i].content.trim();
				announcements[i].title = announcements[i].title.trim();
				if (/:/.test(announcements[i].content.substr(0, 1))) {
					announcements[i].content = announcements[i].content.slice(1, announcements[i].content.length).trim();
				}
			});

			for (let i = 0; i < operations.length; i++) {
				for (let j = 0; j < announcements.length; j++) {
					operations[i](j);
				}
			}

			const result = {
				announcements: cleanAnnouncements,
				birthdays,
				dayType,
				jeansDay
			};

			resolve(result);
		});

		pdfParser.loadPDF(path);
		
	});
}

function getParsed(date, callback) {
	const formattedDate = date.getFullYear() + '-' + utils.leadingZeros((date.getMonth()+1)) + '-' + utils.leadingZeros((date.getDate()+1));
	const path = __dirname + '/../public/daily-bulletin/' + formattedDate + '.pdf';

	if (!config.production) {
		parseBulletin(path).then((result) => {
		
			fs.writeFile(__dirname + '/../public/parsed-daily-bulletin/' + formattedDate + '.pdf.json', JSON.stringify(result), (err) => {
				if (err) {
					console.log(`[${new Date()}] Error occurred parsing daily bulletin writing to file! (${err})`);
				}
				console.log(`[${new Date()}] Successfully parsed daily bulletin! ${formattedDate}`);
	
	// ----------This will be the actuall part of this function, above and below are supposed to be in the tasks file.----------
				fs.readFile(__dirname + '/../public/parsed-daily-bulletin/' + formattedDate + '.pdf.json', (err, data) => {
					if (err) {
						callback(new Error('Error occurred reading daily bulletin!'), null);
					}
					callback(null, JSON.parse(data));
				});
	// -------------------------------------------------------------------------------------------------------------------------
	
			});
		})
		.catch((err) => {
			console.log(`[${new Date()}] Error occurred parsing daily bulletin! (${err})`);
			callback(new Error('Error occurred parsing daily bulletin!'), null);
		});
	} else {
		fs.readFile(__dirname + '/../public/parsed-daily-bulletin/' + formattedDate + '.pdf.json', (err, data) => {
			if (err) {
				callback(new Error('Error occurred reading daily bulletin!'), null);
			}
			callback(null, JSON.parse(data));
		});
	}

}



module.exports.baseURL       = dailyBulletinUrl;
module.exports.queryLatest   = queryLatest;
module.exports.queryAll      = queryAll;
module.exports.getList       = getList;
module.exports.parseBulletin = parseBulletin;
module.exports.getParsed     = getParsed;
