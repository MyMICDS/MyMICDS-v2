import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import testLunch from './lunch.json';
import { buildRequest } from './shared';

describe('Lunch', () => {
	before(async function() {
		// DB isn't actually used for these tests, but it is necessary for the API to start
		this.mongo = new MongoMemoryServer();
		const [app] = await initAPI(await this.mongo.getUri());
		this.request = supertest(app);
	});

	describe('GET /lunch', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/lunch';

		// Might need to be changed every so often
		const date = { year: 2020, month: 1, day: 31 };

		it('retrieves the lunch', async function() {
			const res = await buildRequest(this).query(date).expect(200);

			expect(res.body.data).to.have.property('lunch').that.deep.equals(testLunch);
		});
	});

	after(async function() {
		await this.mongo.stop();
	});
});
