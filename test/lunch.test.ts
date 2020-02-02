import { GetLunchResponse } from '@mymicds/sdk';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { assertType } from 'typescript-is';
import { initAPI } from '../src/init';
import { buildRequest } from './helpers/shared';

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

		it('gets lunch data', async function() {
			const res = await buildRequest(this).expect(200);
			assertType<GetLunchResponse>(res.body.data);
		});
	});

	after(async function() {
		await this.mongo.stop();
	});
});
