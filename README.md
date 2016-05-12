[![Build Status](https://travis-ci.org/Magnetme/ng-async.svg?branch=master)](https://travis-ci.org/Magnetme/ng-async)

# $async

$async is an async/await implementation based on generators for use with angular.

# Install

`npm install ng-async`

# Usage

## As service
```javascript
import ngAsync from 'ng-async';

angular.module('my-module', [ngAsync.name])
	.controller('my-controller', function($async) {
		const init = $async(function*() {
			const { data : users } = yield $http.get('/users');
			$scope.users = users;
		});
	});
```

## To wrap a service/controller

```javascript
import ngAsync, { $async } from 'ng-async';

angular.module('my-module', [ngAsync.name])
	.controller('my-controller', $async(function*($http) {
		'ngInject';
		const { data : users } = yield $http.get('/users');
		$scope.users = users;
	}));
```

Note: To wrap a service/controller it *must* be explicitly annotated. The example uses [ng-annotate](https://github.com/olov/ng-annotate) to do it for us.

Note: keep in mind that an `$async` function returns a promise, not a value. This is especially important with factories, since their return value will be used for injection.

# Prerequisites

- ES6 support in either your host environment or your build chain. At minimum your environment should support the following:
  - Generators
  - Modules
  - Lambdas
  - `const`/`let`
  - Rest parameters
- Angular should be available to the module via the module loader with `import 'angular'`.
- Angular `^1.3.0`

# Why?

ES7 introduces [async functions](http://tc39.github.io/ecmascript-asyncawait/), which create a way to write asynchronous code with a synchronous syntax.
Unfortunately this doesn't work well with Angular: code after a call to `await` does not run in the digest cycle, and thus it won't update the screen. To illustrate:

```html
<ul>
	<li ng-repeat="user in users">
	  {{ user.name }}
	</li>
</ul>
```
```javascript
$scope.users = [];
async function init() {
	const { data : users } = await $http.get('/users');
	//This does not run in a digest cycle
	$scope.users = users;
}
```

Since the `$scope.users = users;` line does not run in a digest cycle, the view isn't updated. To solve this with async functions you need to put `$scope.$apply` calls after each `await`ed statement.

`$async` implements similar functionality with the help of generators in such a way that all code in an `$async` function does run in the digest cycle.

# How should I use it?

Usage of `$async` is very similar to usage of plain async functions. Instead of creating an async function you should pass a generator function to `$async`, and where you would use `await` in an async function you now need to use `yield`. Additionally you don't need the `$scope.$apply` calls anymore.

```javascript
//with async functions
async function foo() {
	$scope.someStuff = await getSomeStuffAsync();
	$scope.$apply();
	$scope.someOtherStuff = await getSomeOtherStuffAsync();
	$scope.$apply();
	console.log("we're done");
}

//equivalent with $async, but angular proof:
const foo = $async(function*() {
	$scope.someStuff = yield getSomeStuffAsync();
	$scope.someOtherStuff = yield getSomeOtherStuffAsync();
	console.log("we're done");
});
```

# How can I pass arguments to an $async function and what happens with `this`?

Arguments are directly passed to the generator function and the this that is used to call the `$async` function will also be used for the generator function. Example:

```javascript
const myObj = {
	bar : $async(function*(a, b) {
		console.log(`a: ${a}`);
		console.log(`b: ${b}`);
		console.log(`this === myObj: ${this === myObj}`);
	});
}

myObj.bar(1, 2);
//Outputs:
//a: 1
//b: 2
//this === myObj: true
```

