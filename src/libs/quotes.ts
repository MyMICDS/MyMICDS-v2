/**
 * @file Functions for distributing our wisdom throughout the world. One API call at a time.
 * @module quotes
 */

/**
 * Get a quote from the database
 * @function getQuote
 *
 * @param {Object} db - Database connection
 * @param {getQuoteCallback} callback - Callback
 */

/**
 * Returns an array of quotes
 * @callback getQuoteCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} quotes - Array of quotes from database. Null if error.
 */

async function getQuotes(db) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const quotesData = db.collection('quotes');

	try {
		return await quotesData.find({}).toArray();
	} catch (e) {
		throw new Error('There was a problem getting all the quotes from the database!');
	}
}

/**
 * Disperses your knowledge into the universe
 * @function insertQuote
 *
 * @param {Object} db - Database connection
 * @param {string} author - Senpai
 * @param {string} quote - Words of wisdom we should all live by
 * @param {insertQuoteCallback} callback - Callback
 */

/**
 * Whether or not quote was successfully inserted into the database
 * @callback insertQuoteCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function insertQuote(db, author, quote) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof author !== 'string') throw new Error('Invalid author!');
	if (typeof quote !== 'string') throw new Error('Invalid quote!');

	const quotesData = db.collection('quotes');

	try {
		await quotesData.insertOne({
			author,
			quote
		});
	} catch (e) {
		throw new Error('There was a problem inserting the quote into the database!');
	}
}

module.exports.get = getQuotes;
module.exports.insert = insertQuote;
