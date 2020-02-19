import { GetBulletinsResponse } from '@mymicds/sdk';
import { expect } from 'chai';
import * as fs from 'fs-extra';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { assertType } from 'typescript-is';
import { initAPI } from '../src/init';
import * as dailyBulletin from '../src/libs/dailyBulletin';
import { buildRequest, requireLoggedIn } from './helpers/shared';
import { generateJWT, saveTestUser } from './helpers/user';

describe('Daily Bulletin', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);

		await fs.ensureDir(dailyBulletin.bulletinPDFDir);
		await fs.move(dailyBulletin.bulletinPDFDir, dailyBulletin.bulletinPDFDir + '_old');
	});

	describe('GET /daily-bulletin', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/daily-bulletin/';

		it('retrieves the list of daily bulletins', async function() {
			await dailyBulletin.queryLatest();
			const res = await buildRequest(this).expect(200);

			assertType<GetBulletinsResponse>(res.body.data);
			expect(res.body.data.bulletins).to.have.lengthOf(1);
		});
	});

	describe('POST /daily-bulletin/query', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/daily-bulletin/query';

		it('saves the latest daily bulletin', async function() {
			await saveTestUser(this.db, { scopes: ['admin'] });
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			const bulletins = await fs.readdir(dailyBulletin.bulletinPDFDir);
			expect(bulletins).to.have.lengthOf(1);
		});

		it('requires admin scope', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(401);
		});

		requireLoggedIn();
	});

	afterEach(async function() {
		await this.db.dropDatabase();
		await fs.emptyDir(dailyBulletin.bulletinPDFDir);
	});

	after(async function() {
		await this.mongo.stop();
		await fs.rmdir(dailyBulletin.bulletinPDFDir);
		await fs.move(dailyBulletin.bulletinPDFDir + '_old', dailyBulletin.bulletinPDFDir);
	});
});
