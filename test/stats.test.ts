import { assertType } from 'typescript-is';
import { buildRequest } from './helpers/shared';
import { expect } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { GetStatsResponse } from '@mymicds/sdk';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import moment from 'moment';
import supertest from 'supertest';

describe('Stats', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /stats', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/stats';

		it('gets empty usage statistics', async function() {
			const res = await buildRequest(this).expect(200);
			assertType<GetStatsResponse>(res.body.data);
			expect(res.body.data.stats.registered.total).to.equal(0);
		});

		it('gets registered usage statistics', async function() {
			await saveTestUser(this.db);

			const res = await buildRequest(this).expect(200);
			const { gradYears, today, total } = res.body.data.stats.registered;
			expect(total).to.equal(1);
			expect(today).to.equal(1);
			expect(gradYears).to.deep.equal({
				[testUser.gradYear]: {
					[moment(testUser.registered).format('YYYY-MM-DD')]: 1
				}
			});
		});

		it('gets logged in usage statistics', async function() {
			await saveTestUser(this.db);
			await generateJWT(this.db);

			const res = await buildRequest(this).expect(200);
			const { total, gradYears } = res.body.data.stats.visitedToday;
			expect(total).to.equal(1);
			expect(gradYears).to.deep.equal({
				[testUser.gradYear]: 1
			});
		});
	});

	after(async function() {
		await this.mongo.stop();
	});
});
