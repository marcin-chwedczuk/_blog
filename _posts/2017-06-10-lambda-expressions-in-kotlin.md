---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Lambda expressions in Kotlin
date: 2017-06-10 00:00:00
tags: kotlin 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this blog post we will learn about Kotlin lambda expressions
and how they are compiled to JVM bytecode.

#### Basic syntax

To create lambda expression that just prints `Hello, world!`
we write:
{% highlight kotlin %}
val printHelloWorld = {
   println("Hello, world!")
}
{% endhighlight %}
We may invoke this function using either syntax:
{% highlight kotlin %}
printHelloWorld()
// or
printHelloWorld.invoke()
{% endhighlight %}
The former is idiomatic and should be used in your code.

When we need to create a lambda that takes parameters we
use syntax:
{% highlight kotlin %}
val sayHello = { user: String -> 
   println("Hello, $user!") 
}
sayHello("johnny")
// or with multiple parameters
val printSummary = { user: String, score: Int -> 
   println("User '$user' get $score points.")
}
printSummary("johnny", 123)
{% endhighlight %}
When types of parameters may be inferred from the context we may skip them
as in:
{% highlight kotlin %}
val names = arrayOf("joe", "ann", "molly", "dolly")
names.sortedBy { name -> name.length }
// equivalent to
names.sortedBy { name: String -> name.length }
{% endhighlight %}

When working with Kotlin Sequence library you often need to define
short function literals (another name for a lambda expression) that take only
one parameter, for example:
{% highlight kotlin %}
val russianNames = arrayOf("Maksim", "Artem", "Sophia", "Maria", "Maksim")

val selectedName = russianNames
      .filter { name -> name.startsWith("m", ignoreCase = true) }
      .sortedBy { name -> name.length }
      .firstOrNull()
{% endhighlight %}
For this special case Kotlin provides a shortcut, instead of writing:
{% highlight kotlin %}
.filter { name -> name.startsWith("m", ignoreCase = true) }
// we may write
.filter { it.startsWith("m", ignoreCase = true) }
{% endhighlight kotlin %}
Notice that we skipped parameter declaration altogether and 
use `it` keyword to access parameter value. 
If we rewrite our earlier example to use this new feature
we get not only shorter but also much more clearer code:
{% highlight kotlin %}
val selectedName = russianNames
      .filter { it.startsWith("m", ignoreCase = true) }
      .sortedBy { it.length }
      .firstOrNull()
{% endhighlight %}

Function literals in Kotlin always return a value. By default
value of the last expression in a lambda body is returned, for example:
{% highlight kotlin %}
val produceValue = { "foo" }
println(produceValue()) // prints "foo"

val max = { a: Int, b: Int ->
  if (a > b)
      a
  else
      b
}
println(max(10,4)) // prints "10"
{% endhighlight %}
Sometimes we want to return early from a lambda body, in this case
we must follow "return-at-label" syntax:
{% highlight kotlin %}
val doStuff = lambda@ { stopEarly: Boolean ->
   println("line 1")
   if (stopEarly) return@lambda
   println("line 2")
}

doStuff(true)
doStuff(false)
{% endhighlight %}
First we tag lambda expression with label `lambda@`.
You may use any name you like but label must ends with `@` character
(called 'at' character).
Then inside lambda body to signify return we use `return` keyword followed
by label name. There must be no whitespace between `return`
and label name. 

Since "return-at-label" syntax is a bit cumbersome, we may use alternative
approach.
Instead of using a lambda expression we may use an anonymous function:
{% highlight kotlin %}
val doStuff = fun(stopEarly: Boolean) {
   println("line 1")
   if (stopEarly) return
   println("line 2")
}
{% endhighlight %}
Inside anonymous function `return` works like in any other Kotlin function.
Anonymous functions can also be used in cases when we must specify return
type of lambda explicitly:
{% highlight kotlin %}
val returnAny = {
   "foo" as Any
}

val returnAny2 = 
   fun(): Any = "foo"
{% endhighlight kotlin %}

Sometimes you do not need a value of particular lambda parameter,
in this case to avoid mistakes you may replace parameter name with `_`.
For example:
{% highlight kotlin %}
(1..5)
   .map { _ -> rand.nextInt(100) }
   .forEach { println(it) }
{% endhighlight %}

##### Function types

Kotlin provides succinct syntax for specifying function types,
for example `() -> Unit` is type of a function that doesn't take
any parameters and returns nothing, and `(Int) -> Int` is type
of a function that takes single parameter of type `Int` and returns
value of type `Int`. Here are more examples:
{% highlight kotlin %}
val fun1: (Int,Int)->Int = 
   { a,b -> Math.max(a,b) }

val fun2: (String,MutableList<String>)->Unit =
   { s,list -> list.add(s) }

val fun3: (Int,(Int)->Int)->Int = 
   { value, func -> func(value) }
{% endhighlight %}
I believe that `fun1` and `fun2` declarations needs no explanation.
When it comes to `fun3` it is a higher level function, it
returns an integer and takes two arguments,
an integer and a function that takes an integer
and returns an integer.

When we use function types we may also provide names
for parameters, this further improves clarity of
code:
{% highlight kotlin %}
val sin: (angleInRadians: Double) -> Double =
    Math::sin
{% endhighlight %}
In the example above I used method reference `Math::sin`,
this is equivalent to `{ x -> Math.sin(x) }`.

##### Type aliases

Since repeating function types may be tiring and error prone,
we should use Kotlin type aliases to give them meaningful names.
{% highlight kotlin %}
typealias IntToStringConverter = 
   (Int) -> String

typealias StringListAppender = 
   (String,MutableList<String>)->Unit
{% endhighlight kotlin %}
Now we may use aliases instead of repeating types in our declarations, e.g.
{% highlight kotlin %}
val fun2: StringListAppender =
   { s,list -> list.add(s) }
{% endhighlight %}

The last cool thing about type aliases is that they
can use generic parameters. This allows us to
easily create types like:
{% highlight kotlin %}
typealias Predicate<T> = (T) -> Boolean
typealias Converter<FROM,TO> = (FROM) -> TO
{% endhighlight %}

##### Closures

Kotlin lambda expressions may be passed as arguments and returned
from functions. This allows us to apply many techniques from functional
programming. For example:
{% highlight kotlin %}
typealias Counter = ()->Int

fun counter(initValue: Int): Counter {
    var n = initValue
    return { n++ }
}

fun main(args: Array<String>) {
    val c1 = counter(100)

    println(c1()) // 100
    println(c1()) // 101
    println(c1()) // 102
}
{% endhighlight %}

Yet best feature of Kotlin lambdas in comparison to Java 8
lambdas is support of true 
[closures](https://en.wikipedia.org/wiki/Closure_(computer_programming))
- using simple words this is a language feature that allows lambda expression
to access and modify all variables that are in scope of their declarations.
Java 8 lambdas can only access external variables but cannot modify
them, this may be quite limiting when we try to use functional programming
in Java.

Following program demonstrates how closures work in Kotlin:
{% highlight kotlin %}
fun main(args: Array<String>) {
    var sum = 0
    (1..10).forEach { sum += it }
    println(sum)
}
{% endhighlight %}
Here we see that `{ sum += it }` lambda can access and modify `sum` 
variable that is declared outside of lambda body.

##### Implementation

Now you may be wondering how lambda expressions are translated to
JVM bytecode. In Kotlin every lambda is compiled to a small class.
For example simple expression that doesn't use any variables:
{% highlight kotlin %}
val printHelloWorld = {
    println("Hello, world!")
}
{% endhighlight %}
Is compiled to:
{% highlight java %}
@Metadata(/*...*/)
final class AppKt$main$printHelloWorld$1 
        extends Lambda implements Function0 {
   
    public static final AppKt$main$printHelloWorld$1 INSTANCE = 
        new AppKt$main$printHelloWorld$1();

    AppKt$main$printHelloWorld$1() {
        super(/*arity:*/ 0);
    }

    public final void invoke() {
        // actual body of lambda expression
        String var1 = "Hello, world!";
        System.out.println(var1);
    }
}
{% endhighlight %}
This class was generated by Kotlin compiler
and uses types form Kotlin runtime to provide its
functionality. In particular it extends `Lambda` abstract
class. 
`Lambda` constructor takes single parameter that specify 
function arity - a number of parameters that lambda expression takes.
`Lambda` also implements `Function` and `FunctionBase` interfaces,
and provides simple `toString()` implementation that prints function 
type - in our case `() -> kotlin.Unit`.
For your convinience here are simplified definitions of the above types:
{% highlight java %}
// from Kotlin runtime (kotlin.* packages)
public interface Function { }

public interface FunctionBase extends Function, Serializable {
   int getArity();
}

public abstract class Lambda implements FunctionBase {
   private final int arity;

   public Lambda(int arity) {
      this.arity = arity;
   }

   public int getArity() {
      return this.arity;
   }

   public String toString() {
      return Reflection.renderLambdaToString(this);
   }
}
{% endhighlight %}

Classes generated for lambda expressions also implement `FunctionN`
interfaces, where `N` is lambda arity. Again `FunctionN` interfaces
are provided by Kotlin runtime:
{% highlight java %}
public interface Function0 extends Function {
   Object invoke();
}

public interface Function1 extends Function {
   Object invoke(Object var1);
}

public interface Function2 extends Function {
   Object invoke(Object var1, Object var2);
}

// Kotlin runtime contains FunctionN defintions
// up to N=22
{% endhighlight %}

Now lets take a look at how lambda expressions are invoked,
following code:
{% highlight kotlin %}
printHelloWorld()
{% endhighlight %}
Is translated into:
{% highlight kotlin %}
Function0 printHelloWorld = (Function0)
    AppKt$main$printHelloWorld$1.INSTANCE;

printHelloWorld.invoke();
{% endhighlight %}
Notice that since our lambda expression doesn't capture
any external variables in its closure, compiler is free to
share single lambda instance (contained in
static field `INSTANCE`) across all codebase.

The case is more complicated when closures are involved,
for example consider the following code:
{% highlight kotlin %}
var value = 0

val incValue = { value++ }
val decValue = { value-- }

incValue()
decValue()

println(value)
{% endhighlight %}
As usual Kotlin compiler generated classes for lambdas:
{% highlight java %}
final class AppKt$main$incValue$1 extends Lambda implements Function0 {
   final IntRef $value;

   AppKt$main$incValue$1(IntRef var1) {
      super(0);
      this.$value = var1;
   }

   public final int invoke() {
      int var1 = this.$value.element++;
      return var1;
   }
}

final class AppKt$main$decValue$1 extends Lambda implements Function0 {
   final IntRef $value;

   AppKt$main$decValue$1(IntRef var1) {
      super(0);
      this.$value = var1;
   }

   public final int invoke() {
      int var1 = this.$value.element;
      this.$value.element += -1;
      return var1;
   }
}
{% endhighlight %}
Both classes generated for lambda expressions now take a single
parameter of type `IntRef`. As you may suspect this class is a
wrapper around `value` variable, its definition is again part of Kotlin
runtime:
{% highlight java %}
public final class IntRef implements Serializable {
   public int element;

   public String toString() {
      return String.valueOf(this.element);
   }
}
{% endhighlight %}
This time our original code is compiled into:
{% highlight java %}
// var value = 0
IntRef value = new IntRef();
value.element = 0;

// val incValue = { value++ }
Function0 incValue = 
    (Function0)(new AppKt.main.incValue.1(value));

// val decValue = { value-- }
Function0 decValue = 
    (Function0)(new AppKt.main.decValue.1(value));

// incValue()
incValue.invoke();

// decValue()
decValue.invoke();

// println(value)
int var4 = value.element;
System.out.println(var4);
{% endhighlight %}
As we can see code generated for lambdas with closures is much
more complicated. Value of every variable accessed by lambda expression
must be stored in lambda class field. Primitive types must be wrapped
in classes like `IntRef` and unwrapped when they values are needed
(reference types are not wrapped).
Also bear in mind that compiler instantiates plenty of new objects even
for a simple code used in our example, this may negatively affect
performance of your application if you are not careful.

#### Using receiver object

Sometimes we want lambda expression to behave as it was
a method on some object, we will call this object receiver.
By this I mean that lambda will have
access to `this` value and also lambda will be able to
call other methods on receiver without any qualification. 
This behaviour is mostly used when we create
custom [DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)
(for more details [see Kotlin official documentation](https://kotlinlang.org/docs/reference/type-safe-builders.html)).

Let's look at a simple example:
{% highlight kotlin %}
class DummyObject {
    fun foo() { println("foo") }
    fun bar() { println("bar") }
}

fun main(args: Array<String>) {
    val f1: DummyObject.() -> Unit = {
        // call methods without qualification
        foo()
        bar()

        // we can use this
        this.foo()

        // this will have type of the receiver object
        val this_: DummyObject = this
        this_.bar()
    }

    // we can call lambda in a classic way
    f1(DummyObject())

    // or using more idiomatic syntax
    val dummy = DummyObject()
    dummy.f1()
    
}
{% endhighlight %}
First we declare `f1` to be a lambda that operates on receiver objects
of type `DummyObject`, to do that we prepend `TypeOfReceiver.` to
a function type.
Then we may call methods on current receiver object without any qualification,
and use `this` to obtain current receiver.
Of course when invoking such a lambda we must provide receiver, we can
either pass it as a first parameter or use special `receiver.lambda_name(args)` syntax.

A bit of warning here, in our example if we add `f1()` method to
our `DummyObject` then that method would be called and not our
lambda if we use `receiver.lambda_name(args)` syntax:
{% highlight kotlin %}
val dummy = DummyObject()
dummy.f1() // object methods have precedence
{% endhighlight %}

Lambdas with receiver were devised to allow creation of
easy to use DSLs, you should not use them in you code until
you are building custom DSL.

One more thing, sometimes we want to convert a call to an object
method to a lambda expression. We don't need to use lambdas with
receiver to achieve that, plain lambda is enough:
{% highlight kotlin %}
val dummy = DummyObject()

val x: ()->Unit = { dummy.foo() }
x()

val y = { dummy.bar() }
y()
{% endhighlight %}
Or even better we may use method references (borrowed by Kotlin from Java 8):
{% highlight kotlin %}
val dummy = DummyObject()

val x: ()->Unit = dummy::foo
x() // calls foo on dummy

val y = dummy::bar
y() // calls bar on dummy
{% endhighlight %}

#### Using lambdas with `inline` methods

Kotlin supports `inline` methods, they are similar to macros in
C and LISP and allow us to add new statements to the language.
To understand how `inline` methods work we will create a new
statement that executes given block of code and reports how much
time that execution took.

We will start with plain method:
{% highlight kotlin %}
fun time(blockName: String, codeBlock: ()->Unit) {
    val startTime = System.currentTimeMillis()

    try {
        codeBlock()
    }
    finally {
        val endTime = System.currentTimeMillis()
        println("execution of $blockName took ${endTime-startTime} ms.")
    }
}
{% endhighlight %}
Then we may use this method to measure time of e.g. printing new line
to the standard output:
{% highlight kotlin %}
time("simple println", {
    println("Hello, world!")
})
{% endhighlight %}
This doesn't look very readable, fortunately in Kotlin when last
function parameter is of function type we may use alternative syntax:
{% highlight kotlin %}
time("simple println") {
    println("Hello, world!")
}
{% endhighlight %}
This looks more like a language statement than a function call, but we still
call `time` function. Yet we may do even better than that, if we add `inline`
modifier to the `time` function compiler will inline our function at callsite
instead of calling it.
For example with:
{% highlight kotlin %}
inline fun time(blockName: String, codeBlock: ()->Unit) {
{% endhighlight %}
Our sample call is translated by compiler into:
{% highlight java %}
String blockName$iv = "simple println";
long startTime$iv = System.currentTimeMillis();

String var4, var11;
long endTime$iv1;
try {
    var4 = "Hello, world!";
    System.out.println(var4);
}
finally {
    endTime$iv1 = System.currentTimeMillis();
    var11 = "execution of " + blockName$iv + " took " + 
        (endTime$iv1 - startTime$iv) + " ms.";
    System.out.println(var11);
}
{% endhighlight %}

Kotlin compiler assumes that if we pass lambda expression to
inline function it also will be inlined. For this reason
Kotlin allows us to use `break`, `continue`[1] and `return` statements
in lambdas that are passed to inline functions, for example:
{% highlight kotlin %}
time("simple println") {
    println("Hello, world!")
    return
}
{% endhighlight %}

Sometimes inline function takes lambda parameter but passes it
to another function, such parameters may not be inlined and should
be marked with `crossinline` modifier. We may also mark 
lambda parameter as "noninlineable" with `noinline` modifier.
In both cases we will
not be able to use `return` and other control flow instructions in
lambdas passed as values to such parameters.

* [1] - `break` and `continue` are not yet supported, but Kotlin team
 plans to add them to the language in a future release.

#### Covariance and contravariance

Kotlin lambda expressions support 
[covariance and contravariance](https://en.wikipedia.org/wiki/Covariance_and_contravariance_(computer_science))
as is illustrated by the following example:
{% highlight kotlin %}
val stringProducer: ()->String = { "foo" }
val anyProducer: ()->Any = stringProducer

println(stringProducer())
println(anyProducer())

val anyConsumer: (Any)->Unit = { any -> println("consumed '$any'") }
val stringConsumer: (String)->Unit = anyConsumer

anyConsumer("bar")
stringConsumer("bar")
{% endhighlight %}
We can see that a lambda that returns `String` may be used
anywhere where a lambda that returns `Any` is expected.
The same goes for parameters, lambda that takes `Any` parameter
may be used in place of a function that takes `String` parameter.

#### How to decompile Kotlin code

To provide decompiled code samples I used [Bytecode Viewer](https://github.com/Konloch/bytecode-viewer/releases) with [FernFlower](https://github.com/fesh0r/fernflower) engine:
![Bytecode Viewer main window](assets/images/2017-06-10/bytecode_viewer.png)


