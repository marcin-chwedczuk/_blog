---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: Nesting monads in Scala
date: 2020-08-01 00:00:01
tags: scala
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I write a lot of async code. Most of my repository
methods return types like `Future[Set[T]]` or `Future[Option[T]]`.
But as we will see, working with such types in pure Scala
can be very cumbersome.

For example in pure Scala we cannot write:
{% highlight scala %}
val namesFuture = Future.successful(List("bob", "alice"));

val capitalizedNames = for {
  names <- namesFuture
  name <- names
} yield name.capitalize
{% endhighlight %}
Nop. Nada. Will not work. When we try to compile this code,
the compiler will point out that `names` have type of `List[String]`
instead of expected `Future[X]`.

To understand the problem better lets remind ourselves
how Scala compiler translates for-comprehensions into
method calls:
{% highlight scala %}
val ks = for {
  i <- 1 to 10
  j <- 1 to i
  k <- 1 to j
  sum = i + j + k
  if (sum > 10 && sum < 20)
} yield 3*sum
// Is translated (with some simplifications) into:
val ks2 = (1 to 10).flatMap { i =>
  (1 to i).flatMap { j =>
    (1 to j)
      .map { k => i + j + k }
      .withFilter { sum => sum > 10 && sum < 20 }
      .map { sum => 3*sum }
  }
}
{% endhighlight %}
In short every but the last "assignment" of the form `var <- something` is
translated into `something.flatMap { var => ...`.
The last "assignment" is translated into a simple `map` call.
`if` filters are translated into `withFilter` or `filter` calls.

Returning to our first example we see that it is translated
into:
{% highlight scala %}
val capitalizedNames = for {
  names <- namesFuture
  name <- names
} yield name.capitalize
// into this:
val capitalizedNames = namesFuture.flatMap { names =>
  names.map(_.capitalize)
}
{% endhighlight %}
And indeed it does not type check as `namesFuture.flatMap` expects
that the passed lambda will return a `Future[X]` not
a `List[X]`.

We can quickly fix this problem by introducing a nested `for`
or by replacing `flatMap` by `map`:
{% highlight scala %}
val capitalizedNames = for { names <- namesFuture } yield
                       for { name <- names } yield name.capitalize;
// or:
val capitalizedNames = namesFuture.map { names =>
  names.map(_.capitalize)
}
// of if you are processing only a single collection:
val capitalizedNames = for { names <- namesFuture }
                       yield names.map(_.capitalize)
{% endhighlight %}
And even in this simple example, the method chain 
becomes quite unreadable when you try to
squash it into a single line: `namesFuture.map(_.map(_.capitalize))`.

Exactly the same problems appears when we try to work with `Future[Option[T]]`.
But here we can at least use libraries to reduce the pain.
For example using `OptionT` type from [Cats](https://typelevel.org/cats/),
we can write:
{% highlight scala %}
import cats.data.OptionT
import cats.implicits._

val nameFuture = Future.successful(Option("foo"))

val f = OptionT(nameFuture)
  .map(name => name + "!")
  .map(name => println(s"name is $name"))
Await.result(f.value, Duration.Inf)
{% endhighlight %}
...and call it a day. 

In pure Scala this code would look like this:
{% highlight scala %}
val f = nameFuture
  .map(_.map(name => name + "!"))
  .map(_.foreach(n => println(s"name is $n")))
Await.result(f, Duration.Inf)
{% endhighlight %}

In short I don't understand why language designers decided to not support
nested monads in for-comprehensions. It's a pity that we have to use
external libraries to get such a basic functionality.