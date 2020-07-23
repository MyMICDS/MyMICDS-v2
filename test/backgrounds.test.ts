import { buildRequest, requireLoggedIn } from './helpers/shared';
import { expect } from 'chai';
import { generateJWT, saveTestUser, testUser } from './helpers/user';
import { initAPI } from '../src/init';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { URL } from 'url';
import * as backgrounds from '../src/libs/backgrounds';
import * as fs from 'fs-extra';
import supertest from 'supertest';

const testImageDir = __dirname + '/images';
const testImages = {
	normal: testImageDir + '/normal.png',
	blur: testImageDir + '/blur.png'
};

describe('Backgrounds', () => {
	before(async function () {
		this.mongo = new MongoMemoryServer();
		const [app, db] = await initAPI(await this.mongo.getUri());
		this.db = db;
		this.request = supertest(app);
	});

	afterEach(async function () {
		await this.db.dropDatabase();
	});

	describe('GET /background', function () {
		this.ctx.method = 'get';
		this.ctx.route = '/background';

		it('returns the default background', async function () {
			const res = await buildRequest(this).expect(200);

			expect(res.body.data).to.have.property('hasDefault').that.is.true;
			expect(res.body.data).to.have.property('variants').that.has.keys('normal', 'blur');

			const normalPath = new URL(res.body.data.variants.normal).pathname;
			const normalRes = await this.request.get(normalPath).expect(200);
			expect(normalRes.body).to.deep.equal(
				await fs.readFile(backgrounds.defaultPaths.normal)
			);

			const blurPath = new URL(res.body.data.variants.blur).pathname;
			const blurRes = await this.request.get(blurPath).expect(200);
			expect(blurRes.body).to.deep.equal(await fs.readFile(backgrounds.defaultPaths.blur));
		});

		it('returns the user background', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const destDir = `${backgrounds.userBackgroundsDir}/${testUser.user}-${Date.now()}`;
			await fs.copy(testImageDir, destDir);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('hasDefault').that.is.false;
			expect(res.body.data).to.have.property('variants').that.has.keys('normal', 'blur');

			const normalPath = new URL(res.body.data.variants.normal).pathname;
			const normalRes = await this.request.get(normalPath).expect(200);
			expect(normalRes.body).to.deep.equal(await fs.readFile(testImages.normal));

			const blurPath = new URL(res.body.data.variants.blur).pathname;
			const blurRes = await this.request.get(blurPath).expect(200);
			expect(blurRes.body).to.deep.equal(await fs.readFile(testImages.blur));

			await fs.remove(destDir);
		});
	});

	describe('PUT /background', function () {
		this.ctx.method = 'put';
		this.ctx.route = '/background';

		it('uploads a user background', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const res = await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.attach('background', testImages.normal)
				.expect(200);

			expect(res.body.data).to.have.property('hasDefault').that.is.false;
			expect(res.body.data).to.have.property('variants').that.has.keys('normal', 'blur');

			const normalPath = new URL(res.body.data.variants.normal).pathname;
			const normalRes = await this.request.get(normalPath).expect(200);
			expect(normalRes.body).to.deep.equal(await fs.readFile(testImages.normal));

			const blurPath = new URL(res.body.data.variants.blur).pathname;
			const blurRes = await this.request.get(blurPath).expect(200);
			expect(blurRes.body).to.deep.equal(await fs.readFile(testImages.blur));

			const dirname = normalPath.split('/')[2];
			await fs.remove(backgrounds.userBackgroundsDir + '/' + dirname);
		});

		it('rejects invalid files', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			await buildRequest(this)
				.set('Authorization', `Bearer ${jwt}`)
				.attach('background', __dirname + '/tsconfig.json')
				.expect(400);
		});

		requireLoggedIn();
	});

	describe('DELETE /background', function () {
		this.ctx.method = 'delete';
		this.ctx.route = '/background';

		it('deletes a user background', async function () {
			await saveTestUser(this.db);
			const jwt = await generateJWT(this.db);

			const userFragment = `${testUser.user}-${Date.now()}`;
			await fs.copy(testImageDir, `${backgrounds.userBackgroundsDir}/${userFragment}`);

			const res = await buildRequest(this).set('Authorization', `Bearer ${jwt}`).expect(200);

			expect(res.body.data).to.have.property('hasDefault').that.is.true;
			expect(res.body.data).to.have.property('variants').that.has.keys('normal', 'blur');

			const normalPath = new URL(res.body.data.variants.normal).pathname;
			const normalRes = await this.request.get(normalPath).expect(200);
			expect(normalRes.body).to.deep.equal(
				await fs.readFile(backgrounds.defaultPaths.normal)
			);

			const blurPath = new URL(res.body.data.variants.blur).pathname;
			const blurRes = await this.request.get(blurPath).expect(200);
			expect(blurRes.body).to.deep.equal(await fs.readFile(backgrounds.defaultPaths.blur));

			await fs.remove(`${backgrounds.userBackgroundsDir}/deleted-${userFragment}`);
		});

		requireLoggedIn();
	});

	after(async function () {
		await this.mongo.stop();
	});
});
