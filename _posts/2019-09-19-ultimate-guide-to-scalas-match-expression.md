---
author: mc
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: WIP Ultimate guide to Scala's match expression 
date: 2019-09-18 00:00:01
tags: scala
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

**WORK IN PROGRESS**

Scala `match` expression is a very powerful tool.
In hands of an experienced programmer it can be used to
create concise and easy to understand code,
yet novice programmers are often intimidated by it.
In this blog post I will describe how `match` expression
work. We will start with the basics and end up with extractors.
After reading this post you will know how `case List(a, b, c)`
works and you should be able to write your own extractors.

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
booleans, floating point numbers (although this makes little sense)
and `null`. We can also mix multiple types in a single `match`
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

When a value cannot be matched with any of the `case` clauses
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

Sometimes we want to access the value matched by "catch all" case.
This is very simple we just need to replace wildcard pattern (`_`)
with a variable name:
{% highlight scala %}
val weatherWildGuess = skyColor match {
  case Color.White => "snow?"
  case Color.Blue => "rain?"
  case Color.Black => "a volcano eruption?"
  case unknownColor => throw new IllegalArgumentException(
      s"Cannot guess weather for sky color: " + unknownColor)
}
{% endhighlight %}

Often it is required to execute the same code for multiple values.
With `match` this can be done using `|` operator:
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

println(option)
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

#### Pattern matching types

Besides matching values `match` can also perform `instanceof` tests:
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
called a parametetrized type). 
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
value to a variable of the target type:
{% highlight scala %}
val result = x match {
  case map: Map[_, _] => map.size * 2
  case list: List[_] => list.size
  case jlist: java.util.List[_] => jlist.size
  case _ => 0
}
{% endhighlight %}
Actually every `case` clause creates it's own lexical scope.
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
    val ss = tmp.asInstanceOf[String]
    println("it's a string: " + ss)
}
{% endhighlight %}
The problem with pattern guards is that they are
imperative. We should try to avoid them
as much as possible. Later we will learn about
extractors, that roughly speaking do the same
job as guards but in a more declarative way.

TODO: 

Extractors:
- Boolean extractors (IsOdd, IsEven)
    - Can I use variable alias?
- Single value extractors (String -> Integer)
- Multiple (fixed) value extractors (JavaList)
    - Discards with `_`
- Extractor nesting (JavaList + EmptyList)
    - Example with monadic for - how the code looks like
- Multiple seq value extractors JavaList2
   - `foo @ _*` binding
- Variable aliases

Extractor real-world usage:
- Case class alias (extractor)
- Matching tuples
- Matching Lists (extractor)
- Regex extractors

Trouble shooting:
- https://stackoverflow.com/a/6173342/1779504 `foo`

