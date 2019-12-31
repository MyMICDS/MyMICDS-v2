import { expect } from 'chai';

describe('testing environment', () => {
	it('should be sane', () => {
		// tslint:disable-next-line:no-unused-expression
		expect(true).to.be.true;

		const num = 2 + 2;
		expect(num).to.equal(4);
		expect(num - 1).to.equal(3);
		// quick maths
	});
});
