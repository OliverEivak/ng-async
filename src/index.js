import angular from 'angular';

export default angular.module('mm.$async', [])
	.factory('$async', ['$q', ($q) => {
		return generator => {
			return function(...args) {
				return $q((resolve, reject) => {
					let it;
					try {
						it = generator.apply(this, args);
					} catch (e) {
						reject(e);
						return;
					}
					function next(val, isError = false) {
						let state;
						try {
							state = isError ? it.throw(val) : it.next(val);
						} catch (e) {
							reject(e);
							return;
						}

						if (state.done) {
							resolve(state.value);
						} else {
							$q.when(state.value)
								.then(next, err => {
									next(err, true);
								});
						}
					}
					//kickstart the generator function
					next();
				});
			}
		}
	}]);

/**
 * Wrapper to make an entire service/controller async.
 *
 * The async service MUST be explicitely annotated for this to work.
 *
 * Example usage:
 *
 * angular.controller($async(['$http', function*($http) {
 *   const data =yield $http.get('somedata');
 * })]);
 *
 * It also works well together with ng-annotate:
 *
 * angular.controller($async(function*($http) {
 *   'ngInject';
 *   const data =yield $http.get('somedata');
 * }));
 */
export const $async = function(annotatedService) {
	if (!Array.isArray(annotatedService)) {
		throw new Error('$async services must use explicit annotations for its dependencies');
	}

	//We're going to wrap the async service function, so we first need to extract it from the array
	const serviceFunction = annotatedService.pop();

	//Our wrapper needs $async to work. We pre-prend it to the dependencies such that the wrapper gets
	//it as the first argument
	annotatedService.unshift('$async');
	//The wrapper simply wraps the serviceFunction with $async and then proxies the dependencies to
	//the async service
	annotatedService.push(($async, ...deps) => $async(serviceFunction).apply(this, deps));

	return annotatedService;
}
