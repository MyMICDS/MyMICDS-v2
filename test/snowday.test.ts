import { assertType } from 'typescript-is';
import { buildRequest } from './helpers/shared';
import { GetSnowdayResponse } from '@mymicds/sdk';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

describe('Snowday', () => {
	before(async function () {
		// DB isn't actually used for these tests, but it is necessary for the API to start
		this.mongo = new MongoMemoryServer();
		const [app] = await initAPI(await this.mongo.getUri());
		this.request = supertest(app);
	});

	describe('GET /snowday', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/snowday';

		it('gets snowday data', async function () {
			const res = await buildRequest(this).expect(200);
			assertType<GetSnowdayResponse>(res.body.data);
		});
	});

	after(async function () {
		await this.mongo.stop();
	});
});
