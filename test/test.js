//The mock module needs to be imported first, since it provides browser mocks that angular needs.
//Also note that this needs to be in a separate module: inlining it will move it below the imports
//in the transpilation process, making the mocks unavailable to angular
import 'babel-polyfill';
import './mock';
import angular from 'angular';
import ngAsync, { $async } from '../src';
import chai from 'chai';
import spies from 'chai-spies';

chai.use(spies);
const expect = chai.expect;


describe('service $async(gen)', () => {
	const injector = angular.injector(['ng', ngAsync.name ]);

	const $async = injector.get('$async');
	const $q = injector.get('$q');

	it('should return a function', () => {
		const asyncFunc = $async(function*() {});
		expect(asyncFunc).to.be.a('function')
	});

	it('should call `gen` when the returned function is called', () => {
		const spy = chai.spy(function*(){});
		const asyncFunc = $async(spy);
		asyncFunc();
		expect(spy).to.have.been.called();
	});

	it('should pause on yielded promises', () => {
		const spy = chai.spy(function(){});
		const asyncFunc = $async(function*() {
			yield new Promise(resolve => {});
			spy();
		});
		asyncFunc();
		expect(spy).not.to.have.been.called();
	});

	it('should continue when a yielded promise has resolved', (done) => {
		const asyncFunc = $async(function*() {
			yield new Promise(resolve => {
				setTimeout(() => resolve());
			});
			//If the async function doesn't continue then it will never get here and the test will timeout
			done();
		});
		asyncFunc();
	});

	it('should return the resolved value from yield', (done) => {
		const value = {};
		const asyncFunc = $async(function*() {
			const val = yield new Promise(resolve => setTimeout(() => resolve(value)));
			expect(val).to.be.equal(value);
		});
		asyncFunc()
			.then(() => done(), err => done(err));
	});

	it('should throw from yield when a yielded promise rejects', (done) => {
		const error = new Error();
		const asyncFunc = $async(function*() {
			try {
				yield new Promise((resolve, reject) => {
					setTimeout(() => reject(error));
				});
				done(new Error('Rejected promise did not result in an error being thrown'));
			} catch (e) {
				expect(e).to.be.equal(error);
			}
		});
		asyncFunc()
			.then(() => done(), err => done(err));
	});

	it('should reject the promise when the generator throws before the first yield', (done) => {
		const asyncFunc = $async(function*() {
			throw new Error('error!');
		});
		asyncFunc()
			.then(() => done(new Error('Expected promise to be rejected, but was resolved')),
						err => done());
	});

	//The behaviour of exceptions can differ if they're thrown synchronously or asynchronously,
	//so we need to test both situations
	it('should reject the promise when the generator throws after the first yield', (done) => {
		const asyncFunc = $async(function*() {
			yield new Promise(resolve => setTimeout(resolve));
			throw new Error('error!');
		});
		asyncFunc()
			.then(() => done(new Error('Expected promise to be rejected, but was resolved')),
						err => done());
	});

	it('should continue when a thrown error has been caught in the generator', (done) => {
		const asyncFunc = $async(function*() {
			try {
				yield new Promise((resolve, reject) => setTimeout(() => reject(new Error())));
			} catch (e) {
			}
			//We need the extra yield to make sure the $async generator continues working
			yield new Promise(resolve => setTimeout(resolve));
			done();
		});
		asyncFunc();
	});

	it('should pass its arguments to the generator function', (done) => {
		const args = [1,2,{}];
		const asyncFunc = $async(function*(a, b, c) {
			//NOTE: the regenerator runtime seems to add a bunch of bogus arguments to the argument list.
			//Therefore we cannot use rest parameters here. Any specs compliant implementation should
			//do this properly though.
			expect([a, b, c]).to.eql(args);
		});
		asyncFunc.apply(null, args)
			.then(() => done(), err => done(err));
	});

	it('should keep the value of `this`', (done) => {
		const obj = {
			asyncFunc : $async(function*() {
				expect(this).to.equal(obj);
			})
		};
		obj.asyncFunc()
			.then(() => done(), err => done(err));
	});

});

describe('util $async(service)', () => {
	it('should throw if an unannotated service is passed', () => {
		try {
			$async(function*(){});
			throw new Error('$async did not throw un unannotated service');
		} catch (e) {}
	});

	it('should not throw if an annotated service is passed', () => {
		$async([function*(){}]);
	});

	it('should return an annotated service', () => {
		const wrapped = $async([function*(){}]);
		expect(wrapped).to.be.an('array');
	});

	it('should prepend $async to the dependencies list', () => {
		const wrapped = $async([function*(){}]);
		expect(wrapped).to.have.length(2);
		expect(wrapped[0]).to.equal('$async');
	});

	it('should pass the generator to the $async service when called', () => {
		const func = function*(){};
		const wrapped = $async(['foo', func]);
		const fakeAsync = chai.spy(gen => gen);
		wrapped.pop()(fakeAsync);
		expect(fakeAsync).to.have.been.called.with(func);
	});

	it('should proxy all but the first arguments to the generator', () => {
		const func = chai.spy(function*(foo){});
		const wrapped = $async(['foo', func]);
		const fakeAsync = gen => gen;
		wrapped.pop()(fakeAsync, 'foo');
		expect(func).to.have.been.called.with('foo');
	});

	it('should call the generator with the correct `this` argument', () => {
		const self = {};
		const func = chai.spy(function*() {
			expect(this).to.equal(self);
		});

		const wrapped = $async([func]);
		const fakeAsync = gen => gen;

		wrapped.pop().call(self, fakeAsync);
		expect(func).to.have.been.called();
	});

});
