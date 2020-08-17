import { buildRequest, requireLoggedIn } from './helpers/shared';
import { expect, use } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as calServer from './calendars/server';
import * as canvas from '../src/libs/canvas';
import * as portal from '../src/libs/portal';
import _ from 'lodash';
import chaiSubset from 'chai-subset';
import supertest from 'supertest';

use(chaiSubset);

describe('Feeds', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
		await calServer.start();
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	describe('POST /feeds/canvas-cache', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/feeds/canvas-cache';

		it('updates the Canvas cache', async function () {
			await saveTestUser(this.db, {
				canvasURL: `http://localhost:${calServer.port}/canvas.ics`
			});
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			const { events } = await canvas.getFromCache(this.db, testUser.user);
			expect(events).to.containSubset([
				{ title: 'Test Event 1, Class 1', class: { name: 'TS001:AA' } },
				{ title: 'Test Event 1, Class 2', class: { name: 'TS002:BB' } },
				{ title: 'Test Event 2, Class 2', class: { name: 'TS002:BB' } }
			]);
		});

		requireLoggedIn();
	});

	describe('POST /feeds/portal-queue', function () {
		this.ctx.method = 'post';
		this.ctx.route = '/feeds/portal-queue';

		it('updates the Portal cache', async function () {
			await saveTestUser(this.db, {
				portalURLClasses: `http://localhost:${calServer.port}/portalClasses.ics`,
				portalURLCalendar: `http://localhost:${calServer.port}/portalCalendar.ics`
			});
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			const { events: classesEvents } = await portal.getFromCacheClasses(
				this.db,
				testUser.user
			);
			expect(classesEvents).to.containSubset(
				['h', 'a', 'c', 'd', 'e', 'g', 'c', 'd'].map(i => ({ summary: `class ${i}` }))
			);

			const { events: calendarEvents } = await portal.getFromCacheCalendar(
				this.db,
				testUser.user
			);
			expect(calendarEvents).to.containSubset(
				_.range(1, 5).map(i => ({ summary: `Test Event ${i}` }))
			);
		});

		requireLoggedIn();
	});

	after(async function () {
		await this.mongo.stop();
		await calServer.stop();
	});
});
