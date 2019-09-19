---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Floating point numbers and Unit Testing
date: 2019-09-18 00:00:01
tags: unit-testing 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Floating point numbers are inherently imprecise.
This can be problematic when we try to unit test
numerical algorithms.
Let's see this on an example
(JVM/Scala, ScalaTest used as a testing framework):

{% highlight scala %}
"squaring should work" in {
    val d = 0.6168705534069904

    val result = d*d

    result should be(0.3805292796606466)
}
{% endhighlight %}
This test works just fine... until someone decides to
do a "harmless refactoring" and replaces `d*d` by `Math.pow(d, 2)`:
{% highlight scala %}
"squaring should work" in {
    val d = 0.6168705534069904

    val result = Math.pow(d, 2)

    result should be(0.3805292796606466)
}
{% endhighlight %}
Now the test fails with the following message:
{% highlight no-highlight %}
0.38052927966064654 was not equal to 0.3805292796606466
{% endhighlight %}
The expected and the actual values differ by ~5.6E-17.
Doubles offer precision of about 15 significant digits in a result.
All the other digits after 15th digit are just noise that should be
ignored.

To make our unit-test more robust we have two strategies.
The first strategy is to know the precision that is guaranteed by the algorithm
that we are using, and to round the result to that
precision before returning it to the client:
{% highlight scala %}
def square(d: Double): Double = {
    val d2 = Math.pow(d, 2)
    // Precision from org.apache.commons:commons-math3:3.6.1
    return Precision.round(d2, 8)
}

"squaring should work" in {
    val d = 0.6168705534069904

    val result = square(d)

    result should be(0.38052928) // rounded
}
{% endhighlight %}

The second strategy is to use assertions intended to work
with floating point numbers. Again to use them correctly we need to
be aware of the precision of our algorithm:
{% highlight scala %}
"squaring should work" in {
    val d = 0.6168705534069904

    val result = d*d

    result should be(0.3805292796606466 +- 0.000000005)
}
{% endhighlight %}
In this case it is good to define the precision
as a global constant (or as a constant per algorithm).

Personally I prefer the first strategy, but with
either of them our tests will be more robust and
refactoring-friendly.

#### Troubles with NaN 

Totally different set of problems are connected to `NaN` values.
On JVM operator `==` and `equals` behave 
inconsistently when comparing `NaN`s:
{% highlight scala %}
"Jvm's Double" should {
    "follow JVM spec" in {
        val nan = Double.NaN;

        // Required by IEEE 754 Standard
        (nan == nan) should be(false)

        // Required by JVM Object#equals contract:
        // "for any non-null reference value x,
        //  x.equals(x) should return true"
        nan.equals(nan) should be(true)
    }
}
{% endhighlight %}

Unit testing frameworks often do not help here much.
For example the following test:
{% highlight scala %}
"how to check that a value is NaN?" in {
    val nan = Double.NaN;
    nan should be(nan)
}
{% endhighlight %}
will fail with a rather unhelpful message:
{% highlight no-highlight %}
NaN was not equal to NaN
{% endhighlight %}
According to ScalaTest guidelines we should use `Double#isNaN`
to check if a value is `NaN`:
{% highlight scala %}
"how to check that a value is NaN?" in {
    val nan = Double.NaN;
    nan.isNaN should be(true)
}
{% endhighlight %}

We experience similar troubles when we try to
compare case classes containing double fields with `NaN` values:
{% highlight scala %}
case class CaseClass(d1: Double,
                     d2: Double)

// In test code:
val inf = Double.PositiveInfinity
val nan = Double.NaN

CaseClass(1,2) shouldBe(CaseClass(1,2))
CaseClass(1, +0.0) shouldBe(CaseClass(1, -0.0))
CaseClass(1, inf) shouldBe(CaseClass(1, inf))

// fails: CaseData(1.0,NaN) was not equal to CaseData(1.0,NaN)
CaseClass(1, nan) shouldBe(CaseClass(1, nan))
{% endhighlight %}
I do not have a good solution for this problem.
We can either create a custom assertion for a given case class ourselves,
define a custom equality using 
[Scalactic](http://www.scalactic.org/user_guide/CustomEquality)
or we can use `Option[Double]` and
somehow map `NaN`s to `Option`s `None`.
None of the solutions is great.

The last thing to remember is that we cannot `match` `NaN` values:
{% highlight scala %}
val x = Double.NaN

// will fail
x match {
    case Double.NaN => doStuff()
    case _ => fail("NaN not matched!")
}

// how to do it properly
x match {
    case value@_ if value.isNaN => doStuff()
    case _ => fail("NaN not matched!")
}
{% endhighlight %}

