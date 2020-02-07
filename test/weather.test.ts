import { Weather } from '@mymicds/sdk';
import { expect } from 'chai';
import * as fs from 'fs-extra';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { assertType } from 'typescript-is';
import { initAPI } from '../src/init';
import * as weather from '../src/libs/weather';
import { buildRequest, requireLoggedIn } from './helpers/shared';
import { generateJWT, saveTestUser } from './helpers/user';

describe('Weather', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	describe('GET /weather', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/weather';

		it('gets weather data', async function() {
			const res = await buildRequest(this).expect(200);

			// Can't assert on the whole type because of moment.Moment again
			expect(res.body.data).to.have.property('weather').that.is.an('object');
			assertType<Omit<Weather, 'currently' | 'minutely' | 'hourly' | 'daily'>>(res.body.data.weather);
		});
	});

	describe('POST /weather/update', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/weather/update';

		it('saves the latest weather data', async function() {
			await saveTestUser(this.db, { scopes: ['admin'] });
			const jwt = await generateJWT(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			await fs.access(weather.JSON_PATH);
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
		await fs.remove(weather.JSON_PATH);
	});

	after(async function() {
		await this.mongo.stop();
	});
});
