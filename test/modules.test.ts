import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MyMICDSModuleType } from '@mymicds/sdk';
import * as modules from '../src/libs/modules';
import _ from 'lodash';
import chaiSubset from 'chai-subset';
import supertest from 'supertest';

const testModule = {
	type: MyMICDSModuleType.PROGRESS,
	row: 0,
	column: 0,
	width: 4,
	height: 3
};

use(chaiSubset);

describe('Modules', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	describe('GET /modules', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/modules';

		it('gets default modules', async function () {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data)
				.to.have.property('modules')
				.that.deep.equals(modules.defaultModules);
		});

		it('gets user modules', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await modules.upsert(this.db, testUser.user, [_.clone(testModule)]);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('modules').which.is.an('array').with.lengthOf(1);
			expect(res.body.data.modules[0]).to.containSubset(testModule);
		});
	});

	describe('PUT /modules', function () {
		this.ctx.method = 'put';
		this.ctx.route = '/modules';

		const payload = {
			modules: [testModule]
		};

		it('saves modules', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(payload)
				.expect(200);

			const userModules = await modules.get(this.db, testUser.user);
			expect(userModules).to.be.an('array').with.lengthOf(1);
			expect(userModules[0]).to.containSubset(testModule);
		});

		it('rejects invalid module positions', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			for (const key of ['row', 'column']) {
				const badPayload = {
					modules: [
						{
							...testModule,
							[key]: -1
						}
					]
				};

				await buildRequest(this)
					.set('Authorization', `Bearer ${jwt}`)
					.send(badPayload)
					.expect(400);
			}
		});

		it('rejects invalid module sizes', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			for (const key of ['height', 'width']) {
				const badPayload = {
					modules: [
						{
							...testModule,
							[key]: 0
						}
					]
				};

				await buildRequest(this)
					.set('Authorization', `Bearer ${jwt}`)
					.send(badPayload)
					.expect(400);
			}
		});

		it('rejects overlapping modules', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				modules: [
					testModule,
					{
						...testModule,
						row: 1
					}
				]
			};

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(badPayload)
				.expect(400);
		});

		it('rejects modules that overflow the grid', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const tooWidePayload = {
				modules: [
					{
						...testModule,
						column: 3
					}
				]
			};

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.send(tooWidePayload)
				.expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function () {
		await this.mongo.stop();
	});
});
