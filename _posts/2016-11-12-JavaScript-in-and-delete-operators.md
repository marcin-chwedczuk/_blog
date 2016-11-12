---
layout: post
cover: 'assets/images/cover8.jpg'
title: JavaScript in and delete operators
date:   2016-11-12 00:00:01
tags: javascript
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will describe `in` and `delete` JavaScript operators.

Operator `in` can be used to check if given object has given property:
{% highlight javascript %}
var obj = {
	propA: 'xxx',
	propB: { someData: 101 }
};
	
console.log('propA' in obj); // true
console.log('notExisting' in obj); // false
	
obj.notExisting = 'xxx';
console.log('notExisting' in obj); // true

var propName = 'propA';
console.log(propName in obj); // true
{% endhighlight %}
While checking if object has given property `in` also checks
prototype chain:
{% highlight javascript %}
var proto = {
	propA: 'xxx'
};
	
var obj = Object.create(proto);
obj.propB = 'yyy';
	
console.log('toString' in obj); // true - from Object
console.log('propA' in obj); // true - from proto
console.log('propB' in obj); // true - own property
{% endhighlight %}

Adding properties to objects in JavaScript is easy, what's about removing?
{% highlight javascript %}
var obj = { };
obj.prop = 1;

// attempt to remove prop
obj.prop = undefined;

// assigning undefined to property doesn't remove it 
console.log('prop' in obj); // true
console.log(Object.keys(obj)); // ["prop"]

delete obj.prop;
// or delete obj['prop'];

// now property is gone
console.log('prop' in obj); // false 
console.log(Object.keys(obj)); // []
{% endhighlight %}
But we cannot delete anything from prototype chain:
{% highlight javascript %}
var proto = { prop: 1 };
var obj = Object.create(proto);

console.log('prop' in obj); // true
console.log(Object.keys(obj)); // []

delete obj.prop;

// nothing changed
console.log('prop' in obj); // true
console.log(Object.keys(obj)); // []
{% endhighlight %}
Also in strict mode we cannot delete global functions and variables
but we can delete properties of `window` object:
{% highlight javascript %}
function globalFunc() { }
var globalVar = 1;
window.globalViaProp = 1;

(function () {
  'use strict';

  // "SyntaxError: Delete of an unqualified identifier in strict mode.
  // delete globalFunc;
  // delete globalVar;
  // delete globalViaProp;
  
  // "TypeError: Cannot delete property 'globalVar' of #<Window>
  // delete window.globalVar;
  // delete window.globalFunc;
  delete window.globalViaProp; // ok
 
})();
{% endhighlight %}
As usual with JavaScript without strict mode you won't get any of these errors.

And what if you want to make one of your own properties undeletable?  
No problem just mark is as a non configurable prop:
{% highlight javascript %}
(function () {
  'use strict';

  var obj = {};
  
  Object.defineProperty(obj, 'nonDeletable', {
    value: 'foo forever',
    writable: false,
    configurable: false, // cannot be deleted
    enumerable: true
  });
  
  console.log(obj.nonDeletable);
  
  // strict mode again:
  // "TypeError: Cannot delete property 'nonDeletable' 
  // delete obj.nonDeletable;
})();
{% endhighlight %}

The last thing about `delete` to remember is that it returns `true`
when it manages to remove property and `false` otherwise.
If you think that this may be useful, look at the example below:
{% highlight javascript %}
var proto = { foo: 1};
var obj = Object.create(proto);
	
// property was not removed but we get true
console.log(delete obj.foo); // true
console.log(obj.foo); // 1
	
// property didn't exist but we get true again
console.log(delete obj.bar); // true
console.log(obj.bar); // undefined 
{% endhighlight %}
OK OK to be honest `delete` returns `true` when object 
doesn't have *own* property after executing delete operation.
In other words if `delete` returns `true` we may be certain 
that property name doesn't appear
in array returned by `Object.keys()`.

The End
