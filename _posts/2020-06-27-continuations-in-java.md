---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Continuations in Java
date: 2020-06-27 00:00:01
tags: java functional-programming
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

CSP or Continuation-Passing Style is a style of programming in which
functions return results via callbacks.
For example `+` operator is a function that takes two numbers and
returns their sum. In CSP `+` operator becomes a function that takes
three arguments, two terms and a callback, usually called a continuation in
the context of CSP.
In Java we can express this as:

{% highlight java %}
void add(int a, int b, Cont<Integer> cont) {
    cont.apply(a + b);
}

@FunctionalInterface
private interface Cont<R> {
  void apply(R result);
}
{% endhighlight %}

Because functions' results are always returned via callback calls,
CSP is forcing us to name the returned values by naming callback parameters.
In addition CSP makes the order of evaluation of an expression explicit.
For example, a simple Java program in imperative style:
{% highlight java %}
System.out.println(1 + 2 + 3);
System.exit(0);
{% endhighlight %}
Can be expressed in CSP as follows:
{% highlight java %}
add(1, 2, partialSum ->
  add(partialSum, 3, sum ->
    print(sum, unit ->
      System.exit(0))));

static void print(int n, Cont<Void> cont) {
  System.out.println(n);
  cont.apply(null);
}
{% endhighlight %}
While transforming imperative programs into CSP form we may encounter
problems with handling procedures (methods returning `void` in Java).
A lot of functional programming languages do not support procedures,
instead they define a special type called `Unit`, that has only
a single value and use that type to signify that function does
not return any meaningful data.
So defined `Unit` type is often identified with the empty tuple `()`.
In Java we do not have `Unit`, but we may use `Void` type with its only
allowed value `null` to simulate it.

While looking at our last example we may notice that in CSP form,
function arguments can be in one of three forms:
a constant, a variable or a lambda expression.
There is no rule preventing us from passing two or more
callbacks to a single function. 
Indeed this is necessary to translate `if` statement to CSP counterpart:
{% highlight java %}
void iff(boolean expr,
         Cont<Boolean> trueBranch,
         Cont<Boolean> falseBranch) {
    if (expr) trueBranch.apply(true);
    else falseBranch.apply(false);
}
{% endhighlight %}
Instead of `Cont<Boolean>` we could use here `Cont<Void>` as well.

To get a better feel for CSP we will look at three more examples.
We will start with a simple (naive) program for computing sum
of all numbers between given two numbers:
{% highlight java %}
static long sum(int from, int to) {
  long sum = 0;
  for (int i = from; i <= to; i++) {
    sum += i;
  }
  return sum;
}
{% endhighlight %}
The transformation to CSP will become easier
if we first replace `for` loop with recursion:
{% highlight java %}
static long sum_rec(int from, int to) {
  return (from > to)
    ? 0
    : from + sum_rec(from+1, to);
}
{% endhighlight %}
This version can be easily translated into CSP:
{% highlight java %}
static void sumCC(int from, int to, Cont<Long> cont) {
  gt(from, to, fromGreaterThanTo ->
    iff(fromGreaterThanTo,
      x -> cont.apply(0L),
      x -> add(from, 1, from1 ->
        sumCC(from1, to, sumCC1 ->
          addLong(from, sumCC1, cont)))));
}
{% endhighlight %}
Where `gt` is the CSP counterpart of `>` operator.

Next we will transform factorial computing function.
This time we will start with a recursive definition that is 
easier to translate:
{% highlight java %}
static int factorial(int n) {
  if (n == 0) return 1;
  return factorial(n-1)*n;
}
{% endhighlight %}
CSP version of factorial looks like this:
{% highlight java %}
private static void factorial(int n, Cont<Integer> cont) {
  eq(n, 0, isNZero ->
    iff(isNZero,
      x -> cont.apply(1),
      x -> add(n, -1, nm1 ->
        factorial(nm1, fnm1 ->
          multiply(n, fnm1, cont)))));
}
{% endhighlight %}

As the last example we will transform a function
that computes Fibonacci sequence:
{% highlight java %}
static int fib1(int n) {
    if (n < 2) return 1;
    return fib1(n-1) + fib1(n-2);
}
{% endhighlight %}
In CSP it looks like this:
{% highlight java %}
static void fib(int n, Cont<Integer> cont) {
  lt(n, 2, nlt2 ->
    iff(nlt2,
      x -> cont.apply(1),
      x -> add(n, -1, nm1 ->
        fib(nm1, fnm1 ->
          add(n, -2, nm2 ->
            fib(nm2, fnm2 ->
              add(fnm1, fnm2, cont)))))));
}
{% endhighlight %}

Now we should have, at least intuitive feel, how the
transformation to CSP works. In fact any program can be
transformed to CSP. The last point is quite interesting,
especially if we pass `() -> exit(0)` or some other not-returning function
as the last continuation. Why? Because in that case we will
never return from any of the called functions.
Let's see how this works on a simple example:
{% highlight java %}
static void main(String[] args) {
    factorial(6, fac6 ->
      print(fac6, x ->
        System.exit(0)));

    System.out.println("Will never be printed");
}
{% endhighlight %}

The entire idea of having a call stack is about providing a way for
the called functions to return the control to the callers.
But if we are never returning, then we don't need a call stack, right?
Not so fast, some of you may say - what about passing arguments to 
the called functions,
call stack is used for that too. Yes, the arguments are also stored on
the call stack but with CSP we capture 
the values of arguments using closures.
Of course JVM does not know that our programs are in CSP form or that they 
would do fine without having a call stack at all.
Instead we get a new call stack frame every time we call something,
this results in `StackOverflowError` quickly when we call
e.g. `factorial(3000, r -> ...)`.

Too avoid `StackOverflowError`s we may use a technique called trampolining. 
Trampolining in connection with CSP
could reduce the required call stack space to a constant number
of slots.
The idea of trampolining is very simple, we split computation into
parts and then we compute only the first part and _return_ a 
continuation (called thunk) that is responsible for computing the rest. 
The returned continuation captures the result of the first computation in
its closure so we don't have to recompute it.
Let's see how a trampolined `+` operator would looks like:
{% highlight java %}
static Thunk add(int a, int b, Cont<Integer> cont) {
    int sum = a + b;
    return () -> cont.apply(sum);
}

static Thunk add3(int a, int b, int c, Cont<Integer> cont) {
    return add(a, b, sum ->
            add(sum, c, cont));
}

@FunctionalInterface
private interface Cont<R> {
    Thunk apply(R result);
}

@FunctionalInterface
private interface Thunk {
    Thunk run();
}
{% endhighlight %}
Notice that trampolined `+` operator splits its computation
into two parts: computing the sum and calling the continuation.
The called continuation will again split it's work and so on and on.

`add3` function illustrates two key points. 
One is that the logical flow of the program stays the same, we just
call the passed continuations like in a pure CSP program.
The other is, that to introduce trampolining we only need to modify
primitives provided by our programming language (operators and statements).
The program code stays the same.
Of course because Java is a statically-typed language we need to change 
functions return type from `void` into `Thunk`, but this is
a simple mechanical change that would not be necessary in 
a dynamically-typed language.

Next example illustrates how trampolined `if` statement and
`factorial` looks like. Notice that factorial code did not change,
not counting the return type:
{% highlight java %}
static Thunk iff(boolean expr,
                 Cont<Boolean> trueBranch,
                 Cont<Boolean> falseBranch) {
  return (expr)
    ? () -> trueBranch.apply(true)
    : () -> falseBranch.apply(false);
}

static Thunk factorial(int n, Cont<Integer> cont) {
  return eq(n, 0, isNZero ->
    iff(isNZero,
      x -> cont.apply(1),
      x -> add(n, -1, nm1 ->
        factorial(nm1, fnm1 ->
          multiply(n, fnm1, cont)))));
}
{% endhighlight %}

Because we are now performing computation "in parts", we need 
a procedure that will be continually invoking returned thunks,
thus ensuring that out computation is making progress.
A procedure like this is called a trampoline:
{% highlight java %}
static void trampoline(Thunk thunk) {
  while (thunk != null) {
      thunk = thunk.run();
  }
}

static <T> Cont<T> endCall(Consumer<T> call) {
  return r -> {
      call.accept(r);
      return null;
  };
}
{% endhighlight %}
We are also providing a new primitive operator `endCall` that
can be used to mark the last part of the computation.
Using `trampoline` we may now compute `factorial(3000)`
without any troubles:
{% highlight java %}
AtomicInteger res = new AtomicInteger(-1);
trampoline(factorial(400000, endCall(res::set)));
System.out.println(res.get())
{% endhighlight %}
As a side effect, we may now use trampoline to mix
CSP and imperative code in the same program.

CSP and trampolining are not mere theoretical concepts,
there where and are still used to implement e.g. LISP interpreters.
Continuations can also be used to simplify backtracking algorithms.
Source code for this blog post can be found
[here](https://github.com/marcin-chwedczuk/reng/tree/master/test/pl/marcinchwedczuk/continuations).


