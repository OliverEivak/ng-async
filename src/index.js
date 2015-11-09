import angular from 'angular';

export default angular.module('mm.$async', [])
	.factory('$async', ['$q', ($q) => {
		return generator => {
			return function(...args) {
				return $q((resolve, reject) => {
					const it = generator.apply(this, args);
					function next(val) {
						const state = it.next(val);
						if (state.done) {
							resolve(state.value);
						} else {
							$q.when(state.value)
								.then(next, err => it.throw(err));
						}
					}
					//kickstart the generator function
					next();
				});
			}
		}
	}]);
