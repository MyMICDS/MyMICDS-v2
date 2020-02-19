import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as quotes from '../src/libs/quotes';
import { buildRequest, validateParameters } from './helpers/shared';

use(chaiSubset);

const testQuote = {
	quote: 'test quote',
	author: 'some really cool dude'
};

describe('Quotes', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /quote', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/quote';

		it('retrieves a quote', async function() {
			await quotes.insert(this.db, testQuote.author, testQuote.quote);

			const res = await buildRequest(this).expect(200);
			expect(res.body.data).to.have.property('quote').that.containSubset(testQuote);
		});
	});

	describe('POST /quote', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/quote';

		const payload = testQuote;

		it('inserts a quote', async function() {
			await buildRequest(this).send(payload).expect(200);

			const allQuotes = await quotes.get(this.db);
			expect(allQuotes).to.containSubset([ testQuote ]);
		});

		validateParameters(payload);
	});

	after(async function() {
		await this.mongo.stop();
	});
});
