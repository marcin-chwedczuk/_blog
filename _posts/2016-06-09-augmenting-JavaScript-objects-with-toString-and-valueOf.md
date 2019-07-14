---
author: mc
layout: post
cover: 'assets/images/cover7.jpg'
title: Augmenting JavaScript objects with toString and valueOf
date:   2016-06-09 00:00:00
tags: javascript
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
---

Today I want to present two useful methods: `toString` and `valueOf`. Both of these methods are 
used by JavaScript interpreter when converting objects to primitive types.

We will start with `toString` that can be useful for debugging purposes, say we have an object:
{% highlight js %}
var point = {
  x: 10,
  y: 20
};
{% endhighlight %}
When we try to convert it to `String` e.g. using `'' + point` expression, we get (in Chrome):
{% highlight no-highlight %}
[object Object]
{% endhighlight %}
Wouldn't it be nice to get `(10, 20)`? With support of `toString` we can do it, simply
let's augment our point with `toString` method:
{% highlight js %}
point.toString = function() {
    return '(' + this.x + ', ' + this.y + ')';
};
{% endhighlight %}
now `String(point)` returns:
{% highlight js %}
"(10, 20)"
{% endhighlight %}
This works too when we concatenate our point with string, or when we are join'ing array of points:
{% highlight js %}
> 'current position: ' + point
"current position: (10, 20)"

> [point, point, point].join('; ');
"(10, 20); (10, 20); (10, 20)"
{% endhighlight %}
It will also work in any other situation when object is coerced to `String` type. Unfortunately
it doesn't work with `console.log`:
{% highlight js %}
> console.log(point)
Object {x: 10, y: 20}
{% endhighlight %}

Now we go into interesting topic: when JavaScript objects are converted to string's?
We already given two examples: when object is concatenated with string and when we explicitly
convert object to string via `String(obj)` call.
But this will also happen when we use object with operators like `>` or `>=`. 
Exact rules are pretty compiled and
if your are interested in them I advice reading chapter 8 (Type coercion) and 9 (Operators) from excellent 
[Speaking JS book.](http://speakingjs.com/es5/ch08.html)
For now let's consider simple example, what will happen when we try to use `>` on
points with `toString` method:
{% highlight js %}
var Point = function(x, y) {
    this.x = x;
    this.y = y;
};

Point.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ')';
};

var p1 = new Point(10, 20);
var p2 = new Point(20, 30);
var p3 = new Point(20, 15);
{% endhighlight %}
When interpreter executes expression like `p1 > p2` first it tries to convert objects to
primitives - first by calling `valueOf` method (by default it will return `this`) and if 
it not return primitive value then it tries `toString`. Since we are providing our own
version of `toString` that returns primitive value (a `String`) interpreter will use values returned
by `toString` to compare points, so:
{% highlight js %}
> // because '(20, 30)' > '(10, 20)'  - strings in JS are compared lexicographically
> p1 > p2
false
> p2 > p1
true
> // because '(20, 30)' > '(20, 15)':
> p2 > p3
true
{% endhighlight %}
Looks like we overloaded `>` operator in JavaScript, yay! But we must be aware of limitations of
this technique: first we are comparing strings not object properties, second string in JS are compared
lexicographically so `'2' > '111'`. In other words don't use it in production code it may cause
too much confusion, explicit method like
`Point.compare` would be much better.

Now we can turn to `valueOf` method, in it's working it is similar to `toString` method, only difference
is that it is called when object must be converted to `Number`.
Let's see quick example:
{% highlight js %}
var obj = {
    valueOf: function() {
        return 42;
    }
};

console.log(Number(obj)); // prints 42
{% endhighlight %}

Object is converted to number when used with operators like: `+`, `*` and `-`. Also `valueOf` is used
when objects are compared using `>` or `>=` operators. `valueOf` is not as useful as `toString` IMHO,
but it's worth to know. One more fact is that `Date` objects have custom implementation of `valueOf` method
that returns number of milliseconds from epoch (in other words it returns same value as `getTime()`). Thanks
to this we can use `>` to compare dates, and get difference in milliseconds between dates as: `date2 - date1`.

