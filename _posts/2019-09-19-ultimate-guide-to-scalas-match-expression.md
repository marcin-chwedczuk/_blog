---
author: mc
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: Ultimate guide to Scala's match expression 
date: 2019-09-19 00:00:01
tags: scala
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Scala `match` expression is a very powerful tool.
In hands of an experienced developer it can be used to
create concise and easy to understand code,
yet novice programmers are often intimidated by it.
In this blog post I will describe how `match` expression
work. We will start with the basics and finish with the extractors.
After reading this post you will know how `case List(a, b, c)`
works and you will be able to write your own extractors.

#### Pattern matching values

`match` expression can be used (just like Java's `switch`)
as a more robust `if` statement replacement.
For example we can write:
{% highlight scala %}
val command: String = fetchNextCommand()

command match {
  case "ls" => printDirectoryContents()
  case "ps" => printProcesses()
  case "exit" => exitShell()
}
{% endhighlight %}

`match` expression, in opposite to Java's `switch` is not
limited to strings, Enums and numeric types, but can also match
booleans, floating point numbers (although this isn't a good idea)
and `null` literal.
We can also mix multiple value types in a single `match`
expression:
{% highlight scala %}
val x: Any = 3.1415

x match {
  case true => println("it's true")
  case 3 => println("integer 3")
  case 3.1415 => println("pi approximation")
  case null => println("null")
  case "foo" => println("this 'foo' again!")
  case 'a' => println("character 'a'")
}
// Prints:
// pi approximation
{% endhighlight %}

When we match an Enum value we are not required to
provide cases for all possible values of the Enum:
{% highlight scala %}
object Color extends Enumeration {
  type Color = Value
  val White, Red, Green, Blue, Black = Value
}

val skyColor = Color.Blue

val weatherWildGuess = skyColor match {
  case Color.White => "snow?"
  case Color.Blue => "rain?"
  case Color.Black => "a volcano eruption?"
}

println(weatherWildGuess)
// Prints:
// rain?
{% endhighlight %}

When a value cannot be pattern matched
a `scala.MatchError` runtime exception is thrown.
A special "catch all" case can be
provided to handle all previously unmatched values 
(Scala's `case _` is a counterpart to Java's `switch` `default` label):
{% highlight scala %}
val weatherWildGuess = skyColor match {
  case Color.White => "snow?"
  case Color.Blue => "rain?"
  case Color.Black => "a volcano eruption?"
  case _ => "I don't know"
}
{% endhighlight %}
"catch all" case should be the last one. 
Patterns are matched from top to bottom and the procedure
stops on the first matching `case` clause.

Sometimes we want to access the value matched by "catch all" case,
this can be done by replacing wildcard pattern (`_`)
with a variable name:
{% highlight scala %}
val weatherWildGuess = skyColor match {
  case Color.White => "snow?"
  case Color.Blue => "rain?"
  case Color.Black => "a volcano eruption?"
  case unknownColor => throw new IllegalArgumentException(
      s"Cannot guess weather for sky color: $unknownColor")
}
{% endhighlight %}

Often it is required to execute the same code for multiple values.
With `match` this can be done using `|` (pipe) operator:
{% highlight scala %}
answer.toLowerCase match {
  case "y" | "yes" | "ok" | "proceed" =>
    executeOperation()
  case "n" | "no" | "abort" =>
    abortOperation()
  case _ =>
    askAgain()
}
{% endhighlight %}

`match` can also be used to match against `null`:
{% highlight scala %}
val nullableValue: String = null 

val option = nullableValue match {
  case null => None
  case s => Some(s)
}
{% endhighlight %}

Matching against Double `NaN` value is more problematic, since
`NaN == NaN` must always return `false` according to IEEE 754
Standard. To match against `NaN` we need to use a pattern guard:
{% highlight scala %}
val d: Double = Double.NaN

val result = d match {
  case Double.PositiveInfinity => "+∞"

  // WRONG way to match NaN
  case Double.NaN => "this does not work"
  // RIGHT way to match NaN
  case value if value.isNaN => "NaN"

  // catch-all
  case value => value.toString
}

println(result)
{% endhighlight %}
We will return to pattern guards later.

#### Pattern matching class instances

Besides pattern matching primitive types, `match` can also be used
to compare normal class instances.
For this to work, a matched class must provide a sensible
override for `equals` and `hashCode` methods.

Before we'll see an example, we need to learn about
a certain pitfall of Scala, illustrated by the following code:
{% highlight scala %}
class NotEqualToAnything {
  override def equals(obj: Any): Boolean = false
}

val x = new NotEqualToAnything()
val y = new NotEqualToAnything()

println(x.equals(y)) // false

x match {
  case y =>
    println("Whaaaaa! What has just happened?")
}
// Prints:
// false
// Whaaaaa! What has just happened?
{% endhighlight %}
Why was `x` matched with `case y` despite `x.equals(y)` returning `false`?
Because the `y` in `case y` is a new variable introduced by "catch-all" clause 
to keep the matched value. It's the same construct that we used
earlier to catch unknown colors (`case unknownColor`).
To tell Scala compiler that we want to use the value kept in
a variable instead of introducing a new one,
we just need to quote variable name using <code>&#96;</code> character:
{% highlight scala %}
x match {
  case `y` =>
    println("Whaaaaa! What has just happened?")
  case _ =>
    println("no-match")
}
{% endhighlight %}

Returning to the instances matching, here is a working example:
{% highlight scala %}
class JustInt(val n: Int) {
  // hashCode() omitted for brevity
  override def equals(obj: Any): Boolean = {
    obj match {
      case other: JustInt => other.n == this.n
      case _              => false
    }
  }
}

val j2 = new JustInt(2)
val j3 = new JustInt(3)
val j4 = new JustInt(4)

val just3: Any = new JustInt(3)

just3 match {
  case `j2` => println("just 2!")
  case `j3` => println("just 3!")
  case `j4` => println("just 4!")
}
// Prints:
// just 3!
{% endhighlight %}

One more example before we move on. When we attempt to
match singleton objects we do not need to use <code>&#96;</code> escaping:
{% highlight scala %}
object X { }
object Y { }

val x: Any = X
x match {
  case Y => println("it's Y!")
  case X => println("it's X!")
}
// Prints:
// it's X!
{% endhighlight %}
`case X` will work just fine!

#### Pattern matching types

Besides matching values, `match` can also perform `instanceof` tests:
{% highlight scala %}
val something: Any = new java.util.Random()

something match {
  case _: String => println("a string!")
  case _: Int => println("an int!")
  case _: java.util.Random =>
    println("A Random instance!")
  case _ => println("type unknown!")
}
{% endhighlight %}

As usual on JVM `instanceof` tests will not work with
parametrized types 
(while `class List<T>` is a generic type, 
`List<T>` usage like `List<String>` is
called a parametrized type). 
[Type erasure](https://en.wikipedia.org/wiki/Generics_in_Java#Problems_with_type_erasure)
is here to blame:
{% highlight scala %}
// DO NOT WORK
val x: Any = List[Int](1,2,3)

val result = x match {
  case _: List[String] => "string list" // unreachable code warning
  case _: List[Int] => "int list" // unreachable code warning
}

println(result)
// Prints:
// string list (sic!)
{% endhighlight %}
But not all is lost, we can still preform type tests
on generic types using wildcards (Scala `_` is a conterpart of Java `?`,
consider Scala's `List[_]` and Java's `List<?>`):
{% highlight scala %}
val x: Any = List[Int](1,2,3)

val result = x match {
  case _: Map[_, _] => "a map"
  case _: List[_] => "a list"
  case _: java.util.List[_] => "a java's list"
}

println(result)
// Prints:
// a list
{% endhighlight %}

So far we where not interested in the actual value of the variable,
but only in it's type and so we just discarded the value using `case _: Type`
clause.
But nothing prevents us from assigning the already type checked
value to a variable:
{% highlight scala %}
val result = x match {
  case map: Map[_, _] => map.size * 2
  case list: List[_] => list.size
  case jlist: java.util.List[_] => jlist.size
  case _ => 0
}
{% endhighlight %}

Every `case` clause creates it's own lexical scope.
This means that we can reuse variable names across different `case`es:
{% highlight scala %}
val result = x match {
  case list: java.util.List[_] =>
    val tmp = 10
    list.size + tmp

  case list: List[_] =>
    val tmp = 1
    list.size + tmp
}
{% endhighlight %}

Pipe operator can be used with type checks too, but the
resulting code isn't very readable:
{% highlight scala %}
x match {
  case _:Short | _:Int | _:Long =>
    println("a number!")
}
{% endhighlight %}
If we want to use the value matched by this
pattern we need to use a pattern binder:
{% highlight scala %}
x match {
  case num@(_:Short | _:Int | _:Long) =>
    println(num.asInstanceOf[Number].doubleValue())
}
{% endhighlight %}
Pattern binders allow us to assign a value
that matches a *subpattern* to a variable.
In the extreme case this *subpattern* can be the entire
pattern, as it is in our case. We will return to
the pattern binders later.

#### Pattern matching tuples

Pattern matching on tuples is supported out of the box.
We can match on tuple elements using all previously
described matchers. We can ignore a tuple element
by using "match all" wildcard (`_`):
{% highlight scala %}
// unpacking tuple
(1, 2, 3) match {
  case (a, b, c) => println(s"$a $b $c")
}
// ignoring certain elements
(1, 2, 3) match {
  case (a, _, _) => println(s"$a")
}
// matching values of the tuple
(1, 2, 3) match {
  case (1, e, 3) => println(s"$e")
  case _ => throw new RuntimeException()
}
// matching types of the tuple
val t = ("foo".asInstanceOf[Any],
         1.asInstanceOf[Any],
         true.asInstanceOf[Any])

t match {
  case (s: String, n: Int, b: Boolean) => println(s"$s $n $b")
  case _ => throw new RuntimeException()
}
{% endhighlight %}

We can also match nested tuple structures:
{% highlight scala %}
val t: Any = (1, 2, ("foo", "bar"))

t match {
  case (a, b, (c, d)) => println(s"$a $b $c $d")
  case _ => throw new RuntimeException()
}
// and with other constraints:
t match {
  case (a, 2, (_: String, d)) => println(s"$a $d")
  case _ => throw new RuntimeException()
}
{% endhighlight %}

#### Pattern guards

When pattern matching values, we often need to preform
some additional checks e.g. say we want to match all odd
or even integers. We can use pattern guards for this purpose:
{% highlight scala %}
for (i <- 1 to 10) {
  i match {
    case i if (i%2 == 0) =>
      println(s"$i is even")
    case i if (i%2 == 1) =>
      println(s"$i is odd")
  }
}
{% endhighlight %}
Since pattern guards use predicates (expressions that
return either `true` or `false`) they are very flexible.
We can express both value and type checks using only
pattern guards:
{% highlight scala %}
val x: Any = 3
x match {
  case _ if x == "foo" =>
    "it's this 'foo' again!"
  case _ if x == 3 =>
    "it's three!"
}

val t: Any = "foo"
t match {
  case tmp if tmp.isInstanceOf[String] =>
    val s = tmp.asInstanceOf[String]
    println("it's a string: " + s)
}
{% endhighlight %}
The problem with pattern guards is that they are
imperative. We should try to avoid them
as much as possible. Later we will learn about
extractors, that roughly speaking do the same
job as guards but in a more declarative way.

#### Extractors

Extractors are pattern guards on steroids.
They allow us to build highly readable DSLs and provide
a functional way to match, extract and transform program data.

The simplest extractor return just a `Boolean` value and
can be used as a pattern guard replacement:
{% highlight scala %}
object Odd {
  def unapply(n: Int): Boolean = {
    (n % 2 == 1)
  }
}
object Even {
  def unapply(n: Int): Boolean = {
    (n % 2 == 0)
  }
}

for (i <- 1 to 10) {
  i match {
    case Odd() => println(s"$i is odd")
    case Even() => println(s"$i is even")
  }
}
{% endhighlight %}
Generally speaking extractor is just a value with `unapply` method.
In the last example we used `object`s but extractor can also be kept in variables:
{% highlight scala %}
class MultipleOf(m: Int) {
  def unapply(n: Int): Boolean = {
    (n % m) == 0
  }
}

val multipleOf2 = new MultipleOf(2)
val multipleOf5 = new MultipleOf(5)

for (i <- 1 to 10) {
  i match {
    case m5 @ multipleOf5() => println(s"$m5 is multiple of 5")
    case m2 @ multipleOf2() => println(s"$m2 is multiple of 2")
    case _ =>
  }
}
{% endhighlight %}
Here we also used pattern binders to name the values that where matched
by `multipleOf` extractors.

Unfortunately in the current version of Scala we cannot create parametrized
extractors. In other words we cannot create a universal `multipleOf(n)` extractor.
This also means that pattern guards are not 100% replaceable by extractors.

As the name suggest, the extractors main purpose is to extract the
data from matched values.
Our next extractor will extract non-null values from nullable reference:
{% highlight scala %}
object NonNull {
  def unapply[R](arg: R): Option[R] = {
    if (arg == null) None
    else Some(arg)
  }
}

val strings = List("foo", null, "bar", null)
for (string <- strings) {
  string match {
    case NonNull(s) => print(s)
    case _ => print("placeholder")
  }
  print(" ")
}
// Prints:
// foo placeholder bar placeholder
{% endhighlight %}
`unapply` method can be generic, and should return `Some(value)` in
case of match and `None` when there is not match.

But extractors are not limited to returning only a single value.
In our next example we will learn how to extract `head` and `tail` from
`java.util.List[E]`:
{% highlight scala %}
type JList[E] = java.util.List[E]

object JList {
  def unapply[E](list: JList[E]): Option[(E, JList[E])] = {
    if (list.isEmpty) {
      None
    } else {
      val head = list.get(0)
      val tail = list.subList(1, list.size())
      Some((head, tail))
    }
  }
}

val lists = List(
  java.util.Collections.emptyList[Int](),
  java.util.Arrays.asList(1),
  java.util.Arrays.asList(1, 2, 3)
)

for (list <- lists) {
  list match {
    case JList(head, tail) =>
      println(s"head: $head, tail: $tail")
    case emptyList =>
      println("empty list")
  }
}
{% endhighlight %}
To return multiple values from the extractor we just need to return a
tuple instead of a single value wrapped in `Option[A]`.

Extractors can be nested, this is a really powerful feature.
Given our previous `JList` extractor we can extract not only
the first element but any finite number of elements from the beginning of a list:
{% highlight scala %}
list match {
  case JList(e1, JList(e2, JList(e3, tail))) =>
	 println(s"[$e1, $e2, $e3], tail: $tail")
  case _ =>
}
{% endhighlight %}
To understand how this pattern works it's helpful to look at the equivalent
for comprehension:
{% highlight scala %}
for {
  (e1, tmp1) <- JList.unapply(list)
  (e2, tmp2) <- JList.unapply(tmp1)
  (e3, tail) <- JList.unapply(tmp2)
} {
  println(s"[$e1, $e2, $e3], tail: $tail")
}
{% endhighlight %}

When we extract multiple values, sometimes we want to
ignore some of them.
We can use `_` wildcard, that matches any value, for this purpose:
{% highlight scala %}
list match {
  case JList(_, JList(_, JList(e3, _))) =>
    println(s"3rd element is $e3")
  case _ =>
}
{% endhighlight %}
We can also use pattern binders to assign names to
subpatterns, for example:
{% highlight scala %}
list match {
  case JList(_, tail @ JList(_, JList(e3, _))) =>
    println(s"3rd element is $e3")
    println(s"tail: $tail")
  case _ =>
}
{% endhighlight %}

Matching Java's `List[E]` using nested patterns is not
very comfortable. 
In reality we prefer a syntax like `case JList(e1, e2, e3)`.
Fortunately this can be done in Scala using extractors that return `Option[Seq[E]]`:
{% highlight scala %}
object JList2 {
  def unapplySeq[E](list: JList[E]): Option[Seq[E]] = {
    import scala.jdk.CollectionConverters._
    Some(list.asScala.toSeq)
  }
}

val list = java.util.Arrays.asList(1, 2, 3, 4)

list match {
  case JList2(a, _, c) => println("only 3 elements")
  case JList2(_, _) => println("only 2 elements")
  case JList2(a, b, c, d) =>
    println(s"4 elements: $a, $b, $c, $d")
}
{% endhighlight %}
Notice that we used `unapplySeq` instead of `unapply`.

With `Seq` extractor we can match "tail" of
the list using `_*` pattern:
{% highlight scala %}
list match {
  case JList2(head, tail @ _*) =>
    println(s"head $head, tail $tail")
}
{% endhighlight %}

The last thing that may come handy is the ability to write
extractor expression using either call notation `JList2(head, tail)`
or using operator notation `head JList2 tail`:
{% highlight scala %}
for (list <- lists) {
  list match {
    case head JList tail =>
      println(s"head: $head, tail: $tail")
    case emptyList =>
      println("empty list")
  }
}
{% endhighlight %}
This is mostly useful when we want to provide "operator like" experience
for the programmers. For example when we want to match
`List`s using `e1 :: e2 :: tail` expression.

#### Scala buildin extractors 

Let's finish this post with a tour of Scala buildin extractors.

##### Case classes

When you declare a case class in Scala:
{% highlight scala %}
case class Point(x: Double,
                 y: Double)
{% endhighlight %}
compiler, among other things, adds appropriate
`apply` and `unapply` methods to the case class companion object.
Thanks to this, pattern matching works with case classes out of the box:
{% highlight scala %}
val r = line match {
  case Line(Point(fx, fy), Point(tx, ty), color@_) => 
    s"line(($fx,$fy) -> ($tx,$ty))"
  case _ => 
    "fail"
}
{% endhighlight %}

##### List

Scala `List` implements a singly linked list.
`case object Nil` is used to represent an empty list.
As a singleton object, `Nil` is matched by `case Nil` clause.
`case class ::` is used as a linked list node, it contains
two fields `head` and `next`. Both `Nil` and `::`
extend abstract class `List[E]`.
Because name of the `case class ::` ends in a `:` (colon),
`::` when used as an operator is right associative:
{% highlight scala %}
(1 :: 2 :: 3 :: Nil) == ::(1, ::(2, ::(3, Nil)))
{% endhighlight %}
After this overly simplistic explanation on how `List[E]` works, we
should now understand how pattern matching
works with lists:
{% highlight scala %}
val lists = Seq(
  List(),
  List(1),
  List(1, 2),
  List(1,2,3,4))

for (list <- lists) {
  list match {
    case Nil =>
      println("empty list")

    case head :: Nil =>
      println(s"single element list $head")

    case e1 :: e2 :: Nil =>
      println(s"two element list $e1 $e2")
      
    case head :: tail =>
      println(s"head: $head, tail: $tail")
  }
}
// Prints:
// empty list
// single element list 1
// two element list 1 2
// head: 1, tail: List(2, 3, 4)
{% endhighlight %}

For programmers convenience `unapplySeq` is also
provided on `List` singleton object. It works very similar to 
our `JList` extractor:
{% highlight scala %}
val lists = Seq(
  List(),
  List(1),
  List(1, 2),
  List(1,2,3,4))

for (list <- lists) {
  list match {
    case Nil =>
      println("empty list")

    case List(first, second) =>
      println(s"two element list: [$first, $second]")

    case List(head, tail @ _*) =>
      println(s"head: $head, tail: $tail")
  }
}
// Prints:
// empty list
// head: 1, tail: List()
// two element list: [1, 2]
// head: 1, tail: List(2, 3, 4)
{% endhighlight %}

It is a good exercise to create our own `List[E]` implementation
with all pattern matching facilities that standard `List[E]` provides.

##### Regexes

Scala `Regex` class provides `unapplySeq` extractor.
When a regex matches an input, the extractor will return
values for all matching groups within the regex.
You can create a group within a regex by using parentheses,
for example regex `(\d{3})-(\d{5})` has two groups
`\d{3}` and `\d{5}`. If you want to use parentheses
but do not wish to create a group, you just need to put
`?:` after starting `(` like in `(?:\d{3})?`.
If you want to learn more about regular expressions
you should check out _Mastering Regular Expressions_ book by Jeffrey Friedl.
{% highlight scala %}
val phoneNumbers = List(
  "+48 123-123-123",
  "123-123-123",
  "123123123"
)

val plPhoneNumber = "^(?:\\+(\\d{2})\\s)?(\\d{3}-\\d{3}-\\d{3})$".r
for (phoneNo <- phoneNumbers) {
  phoneNo match {
    case plPhoneNumber(countryPrefix, phoneNo) =>
      println(s"countryPrefix: $countryPrefix, phoneNo: $phoneNo")
    case _ =>
      println("no match")
  }
}
// Prints:
// countryPrefix: 48, phoneNo: 123-123-123
// countryPrefix: null, phoneNo: 123-123-123
// no match
{% endhighlight %}

In practice regex extractors are rarely used with `match` expression.

