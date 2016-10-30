---
layout: post
cover: 'assets/images/mc_cover8.jpg'
title: Hoisting in JavaScript
date:   2016-10-30 00:00:00
tags: javascript
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will describe what is variable hoisting in JavaScript.
But before we go into detailed explanations let's look at
a few code examples.

Let's start with function `bad()` that tries to
access not defined variable:
{% highlight javascript %}
function bad() {
    console.log(notDefinedVariable);
}

bad();
// result:
// "ReferenceError: notDefinedVariable is not defined
{% endhighlight %}
As we would expected attempt to read `notDefinedVariable`
ends with an error, namely `ReferenceError` exception.

Now you may be wondering what will happen when we try
to write value to not defined variable:
{% highlight javascript %}
function bad2() {
    notDefinedVariable = 'fufufu';
}

bad2(); // no error

console.log(notDefinedVariable);
// prints: "fufufu"
{% endhighlight %}
In this case we get no error and everything seems to work,
but after a call to `bad2()` `notDefinedVariable` is still visible.
What happened here is that we accidentally create 
`notDefinedVariable` *global* variable.

Using global variables is regarded by many programmers as
bad practice, especially when you can create them accidentally.
To prevent errors and encourage good programming style 
ECMAScript 5 standard (which defines JavaScript language)
introduced so called *strict mode*.
We can enable strict mode by beginning function with `'use strict';`
instruction.
With strict mode enabled we get `ReferenceError` exception
when we try to write to undefined variable:
{% highlight javascript %}
function bad3() {
    'use strict';
    notDefinedVariable = 'fufufu';
}

bad3();
// result: "ReferenceError: undefinedVariable is not defined
{% endhighlight %}

You may be wondering what will happen when we declare
variable but didn't assign any value to it, will we get
an error while accessing variable value or not?
{% highlight javascript %}
function soSo() {
    'use strict';
    
    var foo;
    console.log(foo);
}

soSo();
// prints: undefined
{% endhighlight %}
We didn't get an error, that's because variables declared using `var` keyword
initially have value of `undefined` until explicitly assigned by the user.

Now let's look on a bit more complicated example:
{% highlight javascript %}
function hoisting1() {
    'use strict';

    console.log(x);
    
    var x = 3;
    console.log(x);
}

hoisting1();
// prints: undefined 3
{% endhighlight %}
You may wonder what happened here. We already know that reading
from undefined variables causes `ReferenceError` exception, but
why first call to `console.log(x)` didn't throw any?
And what about `undefined` value that was printed, 
we know that this is the value of declared but not initialized variables.
So to sum up this function behaves as if variable `x` was declared
at the very beginning of `hoisting1` function:
{% highlight javascript %}
function hoisting1() {
    'use strict';
    
    var x;

    console.log(x);
    x = 3;
    console.log(x);
}
{% endhighlight %}
And this is what hoisting is all about. In JavaScript it doesn't
matter where you declare variables inside function body
because they declarations will be implicitly 
moved to the beginning of the function.
For example `func1()` when processed by JavaScript interpreter
behaves exactly the same as `func2()`:
{% highlight javascript %}
function func1() {
    'use strict';
    
    var x = 1;
    console.log(x);

    for (var i = 0; i < 3; i += 1) {
        console.log(i);
    }

    if (x > 0.5) {
       var y = 2*x;
       console.log(y);
    }
}

function func2() {
    'use strict';

    var x, i, y;

    x = 1;
    console.log(x);

    for (i = 0; i < 3; i += 1) {
        console.log(i);
    }

    if (x > 0.5) {
       y = 2*x;
       console.log(y);
    }
}
{% endhighlight %}

As you may expect hoisting can make troubles when we are not
alert, for example can you spot a bug here:
{% highlight javascript %}
function withBug() {
    'use strict';
    var arrayI = [1,2,3],
        arrayJ = [3,2,1];

    for (var i = 0; i < arrayI.length; i += 1) {
        arrayI[i] += 1;
    }

    for (var j = 0; j < arrayJ.length; j += 1) {
        if (arrayJ[j] == 2) {
            console.log(arrayJ[i]);
            break;
        }
    }
}

withBug();
// prints: undefined
{% endhighlight %}
If `i` was accessible only inside `for(var i ...)` loop
interpreter would spot problem with `console.log(arrayJ[i])` line
and would thrown a `ReferenceError` exception. Unfortunately 
because of hoisting
variable `i` is accessible through entire function body and only
wrong behaviour of our program can tell us that something is wrong.

So how can we make our programs secure against bugs caused by
hoisting? The simples thing to do is to declare all function
variables at the beginning of function body, thus making
hoisting explicit:
{% highlight javascript %}
function sum(array) {
    'use strict';

    // declare all variables at the beginning   
    var arrSum = 0, i;
  
    for (i = 0; i < array.length; i += 1) {
      arrSum += array[i];
    }
  
    return arrSum;
}
{% endhighlight %}
This is simple and effective solution but a bit cumbersome to use,
it would be better to declare variables in the place of their first usage
right? So the second solution is to just ignore the problem, if
you are keeping size of your function small (no longer than 20 lines
of code) and you follow good coding practices (especially you give
your variables good descriptive names, and prefer `forEach` method to
`for` loops)
you should have no problems with hoisting.

In some cases you really want to reduce visibility of a variable to
some block of code, the popular solution to this problem is 
to use [IIFE pattern](https://developer.mozilla.org/en-US/docs/Glossary/IIFE):
{% highlight javascript %}
function iife() {
    'use strict';
    
    // following line produces: ReferenceError: i is not defined
    // console.log('before IIFE: ' + i);
  
    // iife expression - we declare anonymous
    // function and immediately invoke it
    (function() {
      for (var i = 0; i < 3; i+=1) {
        console.log(i);
      }
    }());
  
    // following line produces: ReferenceError: i is not defined
    // console.log('after IIFE: ' + i);
}

iife();
// prints: 0 1 2
{% endhighlight %}
Here variable `i` is visible only inside IIFE expression.
Using IIFE has it's own problems especially when we want to
access `this` value inside IIFE expression.
We must either pass `this` via local variable:
{% highlight javascript %}
function foo() {
	// it is a convention to call such a variable
	// that or self
	var that = this;

	(function() {
		that.someMethod();
	}());
}
{% endhighlight %}
or use `call()` to invoke function:
{% highlight javascript %}
function foo() {
	(function() {
		this.someMethod();
	}).call(this);
}
{% endhighlight %}

Almost every popular language (e.g. Java, C#, C++) follows block scoping
rules, this means that variable is visible only inside a block of
code in which it is declared. For example in Java:
{% highlight java %}
int i = 0;
{
	int j = 3;
	// we can use i and j here
}
// j no longer visible here
for (int k = 0; k < 3; k++ ) {
	// k and i are visible here
}
// k is no longer visible here
// but we can access i
{% endhighlight %}
Compare this with JavaScript version:
{% highlight javascript %}
// can use i, j and k here
var i = 0;
// can use i, j and k here
{
	var j = 3;
	// can use i, j and k here
}
// can use i, j and k here
for (var k = 0; k < 3; k++ ) {
	// can use i, j and k here
}
// can use i, j and k here
{% endhighlight %}
If you have this strange feeling that something is wrong here
you are not the only one.
JavaScript community decided to introduce proper lexical scoping
to JavaScript in ECMAScript 2015 standard (sometimes called ES6).
ECMAScript 2015 introduces a new JavaScript keyword `let` that
works like `var` but with lexical scoping.
Here's how our example looks with `let`:
{% highlight javascript %}
function letTest() {
	'use strict';
	let i = 0;
	{
		let j = 3;
	}
	// cannot use j here
	for (let k = 0; k < 10; k++) {
		console.log(k);
	}
	// cannot use k here 
}

letTest();
{% endhighlight %}
`let` also prohibits redeclarations of variables:
{% highlight javascript %}
function foo() {
	var i = 3;
	var i = 7; // ok

	let j = 3;
	let j = 7; // error
}
{% endhighlight %}
Support of ES6 among browsers is pretty good right now (you may also use it
with node.js), but I guess if you have a chance to work with ES6 you most
probably will be transpiling ES6 code into ES5 code (a plain old JavaScript)
using Babel or some other transpiler.

I hope you now know what hoisting is and what troubles it can make.
If you have any remarks how I can improve this article please leave a comment.
