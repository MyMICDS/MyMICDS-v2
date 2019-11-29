import { Quote } from '@mymicds/sdk';
import { Db } from 'mongodb';

/**
 * Retrieves all quotes from the database.
 * @param db Database connection
 * @returns A list of all saved quotes.
 */
async function getQuotes(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const quotesData = db.collection<Quote>('quotes');

	try {
		return await quotesData.find({}).toArray();
	} catch (e) {
		throw new Error('There was a problem getting all the quotes from the database!');
	}
}

/**
 * Inserts a quote into the database.
 * @param db Database connection.
 * @param author Author of the quote.
 * @param quote Quote content.
 */
async function insertQuote(db: Db, author: string, quote: string) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }
	if (typeof author !== 'string') { throw new Error('Invalid author!'); }
	if (typeof quote !== 'string') { throw new Error('Invalid quote!'); }

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

export {
	getQuotes as get,
	insertQuote as insert
};
