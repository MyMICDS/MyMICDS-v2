import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import { buildRequest } from './helpers/shared';

describe('Dates', () => {
	before(async function() {
		// DB isn't actually used for these tests, but it is necessary for the API to start
		this.mongo = new MongoMemoryServer();
		const [app] = await initAPI(await this.mongo.getUri());
		this.request = supertest(app);
	});

	describe('GET /dates/school-starts', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/dates/school-starts';

		it('returns a valid date', async function() {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data)
				.to.have.property('date').that.is.a('string')
				.and.satisfies((s: string) => !isNaN(new Date(s).getTime()));
		});
	});

	describe('GET /dates/school-ends', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/dates/school-ends';

		it('returns a valid date', async function() {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data)
				.to.have.property('date').that.is.a('string')
				.and.satisfies((s: string) => !isNaN(new Date(s).getTime()));
		});
	});

	describe('GET /dates/breaks', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/dates/breaks';

		it('returns a valid list of dates', async function() {
			const res = await buildRequest(this).expect(200);

			const breakTypes = ['weekends', 'longWeekends', 'vacations', 'other'];

			expect(res.body.data)
				.to.have.property('breaks').that.is.an('object')
				.and.has.keys(breakTypes);

			for (const type of breakTypes) {
				const breaks = res.body.data.breaks[type];
				expect(breaks).to.be.an('array');
				for (const breakObj of breaks) {
					expect(breakObj).to.be.an('object').with.keys('start', 'end');
					expect(breakObj.start).to.be.a('string').that.satisfies((s: string) => !isNaN(new Date(s).getTime()));
					expect(breakObj.end).to.be.a('string').that.satisfies((s: string) => !isNaN(new Date(s).getTime()));
				}
			}
		});
	});

	after(async function() {
		await this.mongo.stop();
	});
});
