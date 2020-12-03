import { Db } from 'mongodb';
import { InternalError } from './errors';
import { Quote } from '@mymicds/sdk';

/**
 * Retrieves all quotes from the database.
 * @param db Database connection
 * @returns A list of all saved quotes.
 */
async function getQuotes(db: Db) {
	const quotesData = db.collection<Quote>('quotes');

	try {
		return await quotesData.find({}).toArray();
	} catch (e) {
		throw new InternalError('There was a problem getting all the quotes from the database!', e);
	}
}

/**
 * Inserts a quote into the database.
 * @param db Database connection.
 * @param author Author of the quote.
 * @param quote Quote content.
 */
async function insertQuote(db: Db, author: string, quote: string) {
	const quotesData = db.collection('quotes');

	try {
		await quotesData.insertOne({
			author,
			quote
		});
	} catch (e) {
		throw new InternalError('There was a problem inserting the quote into the database!', e);
	}
}

export { getQuotes as get, insertQuote as insert };
