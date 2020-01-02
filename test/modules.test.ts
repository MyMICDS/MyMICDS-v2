import { MyMICDSModuleType } from '@mymicds/sdk';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import _ from 'underscore';
import { initAPI } from '../src/init';
import * as modules from '../src/libs/modules';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { buildRequest, requireLoggedIn, validateParameters } from './shared';

const testModule = {
	type: MyMICDSModuleType.PROGRESS,
	row: 0,
	column: 0,
	width: 4,
	height: 3
};

use(chaiSubset);

describe('Modules', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /modules', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/modules';

		it('gets default modules', async function() {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data).to.have.property('modules').that.deep.equals(modules.defaultModules);
		});

		it('gets user modules', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await modules.upsert(this.db, testUser.user, [_.clone(testModule)]);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('modules').which.is.an('array').with.lengthOf(1);
			expect(res.body.data.modules[0]).to.containSubset(testModule);
		});
	});

	describe('PUT /modules', function() {
		this.ctx.method = 'put';
		this.ctx.route = '/modules';

		const payload = {
			modules: [testModule]
		};

		it('saves modules', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);

			const userModules = await modules.get(this.db, testUser.user);
			expect(userModules).to.be.an('array').with.lengthOf(1);
			expect(userModules[0]).to.containSubset(testModule);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function() {
		await this.mongo.stop();
	});
});
