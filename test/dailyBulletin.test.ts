import { assertType } from 'typescript-is';
import { buildRequest, requireLoggedIn } from './helpers/shared';
import { expect } from 'chai';
import { generateJWT, saveTestUser } from './helpers/user';
import { GetBulletinsResponse, GetGDocBulletinResponse } from '@mymicds/sdk';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as dailyBulletin from '../src/libs/dailyBulletin';
import * as fs from 'fs-extra';
import supertest from 'supertest';

describe('Daily Bulletin', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);

		await fs.ensureDir(dailyBulletin.bulletinDir);
		await fs.move(dailyBulletin.bulletinDir, dailyBulletin.bulletinDir + '_old');
	});

	describe('GET /daily-bulletin', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/daily-bulletin/';

		it('retrieves the latest bulletin link', async function () {
			await dailyBulletin.queryLatest();
			const res = await buildRequest(this).expect(200);

			assertType<GetGDocBulletinResponse>(res.body.data);
			expect(res.body.data.bulletin.length).to.be.above(1);
			expect(res.body.data.bulletinDate.length).to.be.above(1);
		});
	});

	describe('POST /daily-bulletin/query', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/daily-bulletin/query';

		it('saves the latest daily bulletin', async function () {
			await saveTestUser(this.db, { scopes: ['admin'] });
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			const bulletins = await fs.readdir(dailyBulletin.bulletinDir);
			expect(bulletins).to.have.lengthOf(1);
		});

		it('requires admin scope', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(401);
		});

		requireLoggedIn();
	});

	afterEach(async function () {
		await this.db.dropDatabase();
		await fs.emptyDir(dailyBulletin.bulletinDir);
	});

	after(async function () {
		await this.mongo.stop();
		await fs.rmdir(dailyBulletin.bulletinDir);
		await fs.move(dailyBulletin.bulletinDir + '_old', dailyBulletin.bulletinDir);
	});
});
