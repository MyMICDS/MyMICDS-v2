import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { initAPI } from '../src/init';
import * as teachers from '../src/libs/teachers';
import { testClass } from './helpers/class';
import { buildRequest, requireLoggedIn } from './helpers/shared';
import { generateJWT, saveTestUser } from './helpers/user';

use(chaiSubset);

describe('Teachers', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /teachers', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/teachers';

		it('gets all teachers', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await teachers.add(this.db, testClass.teacher);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);
			expect(res.body.data).to.have.property('teachers').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.teachers[0]).to.containSubset(testClass.teacher);
		});

		requireLoggedIn();
	});

	after(async function() {
		await this.mongo.stop();
	});
});
