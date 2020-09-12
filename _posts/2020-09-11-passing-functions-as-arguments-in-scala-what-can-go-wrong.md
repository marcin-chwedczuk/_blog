---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: Passing functions as arguments in Scala. What can go wrong?
date: 2020-09-11 00:00:01
tags: scala jvmbloggers
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In microservices architecture we often designate a single service for managing the configuration of the entire system.
Libraries like [Archaius](https://github.com/Netflix/archaius) make this easy. 
As a side effect, on the code level I often see class declarations like this:

{% highlight scala %}
class MyService(timeoutProperty: () => Long) {
  ...
}
{% endhighlight %}

Basically we inject providers for current configuration properties values into classes.
This has two advantages. First, our classes are independent of any library that we are using
for managing configuration. And second, our classes are easy to test - no mocks needed.

Yet this approach can lead to subtle bugs. Say our original code that creates `MyService`
looks like this:
{% highlight scala %}
new MyService(() => currentTimeoutValue())
{% endhighlight %}
Imagine that a few weeks later a Scala purist is coming by and decides to "improve" this code into:
{% highlight scala %}
new MyService(currentTimeoutValue)
{% endhighlight %}
Shorter code, better code as they say...
A few more weeks pass by and we realise that using `Long`s for storing time intervals is passé.
So now we are slowly migrating our `() => Long` providers into `() => java.time.Duration`.
Of course as Scala fanboys we decided to add an extension method to `Long`, to make the entire
process less painful:
{% highlight scala %}
implicit class MyRichLong(l: Long) {
  def asMillisecondsDuration(): Duration = {
    Duration.ofMillis(l)
  }
}
{% endhighlight %}
In meantime, the code responsible for `MyService` creation morphed into:
{% highlight scala %}
class MyServiceRefactored(timeoutProperty: () => Duration) { ... }

new MyServiceRefactored(currentTimeoutValue().asMillisecondsDuration)
{% endhighlight %}
And... BOOM! It's no longer working!

Why this code is no longer working? Because
{% highlight scala %}
new MyServiceRefactored(currentTimeoutValue().asMillisecondsDuration)
{% endhighlight %}
is transformed by Scala compiler into
{% highlight scala %}
val tmp = currentTimeoutValue()
new MyServiceRefactored(() => tmp.asMillisecondsDuration())
{% endhighlight %}
So `timeout` property value is frozen at the moment of `MyServiceRefactored` object creation,
this is not what we want.

Bugs like this are hard to figure out. At the first glance everything works fine.
The problem demonstrates itself only when we try to adjust the property value at runtime.
And even then a simple service restart will reload the property, so we may incorrectly assign
it to a configuration server/library/networking glitch.

Here I must mention that this bug was possible only because we broken one of Scala's good practices.
Our extension method is declared like so
{% highlight scala %}
def asMillisecondsDuration(): Duration
{% endhighlight %}
but we should be declared like this
{% highlight scala %}
def asMillisecondsDuration: Duration
{% endhighlight %}
as this method is actually a getter - it does not mutate the object on which it is called.
If we use the second declaration our bug would be quickly detected by Scala compiler.

In practice a lot of Scala programmers are confused by the optional parentheses
in parameterless method declarations. I often see methods declared like `def foo: Unit`
that mutate the state or method declared like `def bar(): Int` that are just getters.
For people like me, that constantly switch between Java and Scala, this is especially difficult
and I routinely make mistakes like this (I add parentheses everywhere)...

One solution that people often come up with when confronted with this problem is to
replace functions by by-name parameters.

By-name parameters are nothing new. They where first introduced more than 50 years ago in a language called
Algol60. Early programmers of that language quickly found out that by-name parameters are error prone and difficult to use.
As a result most of the contemporary programming languages do not support them.

Scala as ~~an over-engineered~~ a versatile language supports by-name parameters, as they allow programmers
to create functions that mimic the language build-in constructs. For example:
{% highlight scala %}
def repeat(times: Int)(f: => Unit): Unit = {
  for (_ <- 1 to times) {
    f
  }
}

repeat(3) {
  println("hurray!")
}
{% endhighlight %}

The main problem with by-name parameters is that they do not follow the
usual order of evaluation. An ordinary function call
{% highlight scala %}
egg(foo()), bar())
{% endhighlight %}
will result in functions `foo` and `bar` being called one after another,
followed by `egg` function call.
When we use by-name parameters no order is guaranteed, `foo` may be called
before or after `bar` or may not be called at all, 
or may be called three times, or four...
This makes code difficult to reason about.
That is why I use by-name parameters sparingly, usually only when I need to implement a
new statement like construct.

That being said, we may declare our new version of `MyService` as
{% highlight scala %}
class MyService(timeoutProperty: => Duration) {
  ...
}
{% endhighlight %}
and it will work flawlessly with our converted-on-the-fly property:
{% highlight scala %}
new MyService(currentTimeoutValue().asMillisecondsDuration())
{% endhighlight %}

To make it clear that we are passing not a value but an expression to be evaluated
(called a [thunk](https://en.wikipedia.org/wiki/Thunk)), 
we can surround the expression with curly braces:
{% highlight scala %}
new MyService({ currentTimeoutValue().asMillisecondsDuration() })
{% endhighlight %}
But it must be noted that in Scala we can add curly braces to almost anything, 
e.g. `println({1} + {2})`.
In other words curly braces around thunks are only a convention not enforced by the compiler.

Sometimes the best solution is the object-oriented one. So after being disappointed with by-name
params I decided to create an interface:
{% highlight scala %}
@FunctionalInterface
trait Property[V] {
  // parentheses required for lambda -> SAM conversion
  // in Scala 2.13. Yeah this sucks!
  def value(): V
}
{% endhighlight %}
and inject it into `MyService`:
{% highlight scala %}
class MyService(timeoutProperty: Property[Duration]) { ... }
{% endhighlight %}
Scala since version 2.12 supports converting lambda expressions to SAMs (Single Method Interfaces),
so we can create `MyService` without too much ceremony:
{% highlight scala %}
new MyService(() => currentTimeoutValue().asMillisecondsDuration())
{% endhighlight %}
No simplification is possible this time, and both below examples do not compile:
{% highlight scala %}
new MyService({ currentTimeoutValue().asMillisecondsDuration })
new MyService(currentTimeoutValue().asMillisecondsDuration)
{% endhighlight %}

The protection is, unfortunately, not 100% bullet proof.
For example the following code snipped will compile but does not work as intended:
{% highlight scala %}
new MyService(currentTimeoutValue().asMillisecondsDuration _)
{% endhighlight %}
At least it provides a visual clue (`_`) that will attract reviewer attention during the code review.

Now I fully understand why Java designers decided to introduce a new operator `::` for creating method
references. It makes it clear which part of the expression will be evaluated only once and which part
will become the functional interface implementation:
{% highlight scala %}
public static void main(String[] args){
  print(next()::toString);
  print(next().toString()::toUpperCase);
  print(next().toString().toUpperCase()::trim);
  
  print(() -> next().toString());
}
{% endhighlight %}
Compare this with Scala:
{% highlight scala %}
def main(args: Array[String]): Unit = {
  print(next().toString)
  print(next().toString.toUpperCase)
  print(next().toString.toUpperCase.trim)
}
{% endhighlight %}

Looks likes the third solution is the best one. The only thing left is to provide a fake
implementation for `Property[V]` interface to make testing easy:
{% highlight scala %}
class ManuallySetProperty[V](initialValue: V) extends Property[V] {
  private var v = initialValue

  override def value(): V = v
  def setValue(newValue: V): Unit = {
    v = newValue
  }

  override def toString: String = {
    s"property(value=$v)"
  }
}

val timeout = new ManuallySetProperty(Duration.ZERO)
println(timeout.value())
timeout.setValue(Duration.ofMinutes(3))
println(timeout.value())
{% endhighlight %}