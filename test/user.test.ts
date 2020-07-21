import { buildRequest, requireLoggedIn } from './helpers/shared';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as dates from '../src/libs/dates';
import _ from 'lodash';
import chaiSubset from 'chai-subset';
import supertest from 'supertest';

use(chaiSubset);

const [, gradYear] = dates.getSchoolYear(new Date());
const gradeMap = new Map<number, number>();
for (let grade = 12; grade >= -1; grade--) {
	const yearDiff = grade - 12;
	gradeMap.set(grade, gradYear - yearDiff);
}

describe('User', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	describe('GET /user/grad-year-to-grade', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/user/grad-year-to-grade';

		it('converts graduation years to grade levels', async function () {
			for (const [grade, year] of gradeMap) {
				const res = await buildRequest(this).query({ year }).expect(200);
				expect(res.body.data).to.have.property('grade').that.equals(grade);
			}
		});
	});

	describe('GET /user/grade-to-grad-year', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/user/grade-to-grad-year';

		it('converts grade levels to graduation years', async function () {
			for (const [grade, year] of gradeMap) {
				const res = await buildRequest(this).query({ grade }).expect(200);
				expect(res.body.data).to.have.property('year').that.equals(year);
			}
		});
	});

	describe('GET /user/grade-range', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/user/grade-range';

		it('returns a list of graduation years', async function () {
			const res = await buildRequest(this).expect(200);
			expect(res.body.data)
				.to.have.property('gradYears')
				.that.deep.equals([...gradeMap.values()]);
		});
	});

	describe('GET /user/info', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/user/info';

		it('gets user info', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.containSubset(
				_.pick(testUser, ['user', 'firstName', 'lastName', 'gradYear'])
			);
		});

		requireLoggedIn();
	});

	describe('PATCH /user/info', function () {
		this.ctx.method = 'patch';
		this.ctx.route = '/user/info';

		const payload = {
			firstName: 'new first',
			lastName: 'new last',
			gradYear: gradeMap.get(10)
		};

		it('modifies user info', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(200);
			expect(res.body.data).to.containSubset(payload);
		});

		requireLoggedIn();
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	after(async function () {
		await this.mongo.stop();
	});
});
