import { ClassType } from '@mymicds/sdk';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { ObjectID } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import _ from 'underscore';
import { initAPI } from '../src/init';
import * as classes from '../src/libs/classes';
import { saveTestClass, testClass } from './helpers/class';
import { buildRequest, requireLoggedIn, validateParameters } from './helpers/shared';
import { generateJWT, saveTestUser, testUser } from './helpers/user';

use(chaiSubset);

describe('Classes', () => {
	before(async function() {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function() {
		await this.db.dropDatabase();
	});

	describe('GET /classes', function() {
		this.ctx.method = 'get';
		this.ctx.route = '/classes';

		it('gets user classes', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await saveTestClass(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('classes').that.is.an('array').with.lengthOf(1);
			expect(res.body.data.classes[0]).to.containSubset(testClass);
		});

		requireLoggedIn();
	});

	describe('POST /classes', function() {
		this.ctx.method = 'post';
		this.ctx.route = '/classes';

		const payload = {
			..._.omit(testClass, 'teacher'),
			teacherPrefix: testClass.teacher.prefix,
			teacherFirstName: testClass.teacher.firstName,
			teacherLastName: testClass.teacher.lastName
		};

		it('saves a new class', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(200);
			expect(res.body.data).to.have.property('id').that.is.a('string');
		});

		it('modifies an existing class', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db);
			const idString = (_id as ObjectID).toHexString();

			const updatePayload = {
				...payload,
				id: idString,
				color: '#FFFFFF',
				type: ClassType.ART
			};

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(updatePayload).expect(200);
			expect(res.body.data).to.have.property('id').that.equals(idString);

			const userClasses = await classes.get(this.db, testUser.user);
			expect(userClasses).to.be.an('array').with.lengthOf(1);
			expect(userClasses[0]).to.containSubset(_.pick(updatePayload, ['color', 'type']));
		});

		it('rejects invalid teacher data', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const badPayload = {
				...payload,
				teacherPrefix: 'not a real prefix'
			};

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(badPayload).expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	describe('DELETE /classes', function() {
		this.ctx.method = 'delete';
		this.ctx.route = '/classes';

		const payload = {
			id: ''
		};

		it('deletes an existing class', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const { _id } = await saveTestClass(this.db);
			const deletePayload = {
				...payload,
				id: (_id as ObjectID).toHexString()
			};

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(deletePayload).expect(200);

			const userClasses = await classes.get(this.db, testUser.user);
			expect(userClasses).to.be.empty;
		});

		it('rejects an invalid id', async function() {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await saveTestClass(this.db);

			await buildRequest(this).set('Authorization', `Bearer ${jwt}`).send(payload).expect(400);
		});

		requireLoggedIn();
		validateParameters(payload);
	});

	after(async function() {
		await this.mongo.stop();
	});
});
