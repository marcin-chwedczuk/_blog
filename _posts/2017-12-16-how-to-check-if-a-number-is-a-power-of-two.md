---
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: How to check if a number is a power of two
date: 2017-12-16 00:00:00
tags: algorithms 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this blog post we will learn about two algorithms that
allow us to quickly check that a given integer is
a power of two. 
Both of these algorithms use only bit operators, so they are
very efficient.

#### Algortihm I

We will start by looking at the alogorithm implementation,
then I will explain how it works:
{% highlight java %}
/**
 * Checks if a {@code number} is a power of two.
 * <p>
 *     Zero and negative numbers are not considered powers of two.
 * </p>
 * @param number any integer.
 * @return {@code true} when {@code number} is a power of two,
 *  {@code} false otherwise.
 */
boolean isPowerOfTwo(int number) {
    return 
        ( (number & (-number)) == number ) && 
        (number > 0);
}
{% endhighlight %}

Before we move on it is a good time to remind ourselves that
along an algorithm implementation we 
should always specify the range of valid inputs 
and expected outputs.
In the code above I used Javadoc comments to state that our algorithm
will accept any number (positive, nagative or zero) but it
will consider only positive numbers to be powers of two.
For example `isPowerOfTwo(8)` should return `true` but 
`isPowerOfTwo(-16)` should return `false`.

Now it is time to explain how the algorithm works.
If we look at the binary representation of the powers of
two we can see the following bit pattern - there is
only a single bit set:
![powers of two](assets/images/2017-12-16/powers_of_two.svg)

Now comes the tricky part. Computers use 
[two's complement](https://en.wikipedia.org/wiki/Two%27s_complement)
encoding to efficiently store 
and perform operations on both positive and negative numbers.

To explain how two's complement works we must first 
realise that pure binary encoding can only be used 
to store postive numbers:
![binary representation of 17](assets/images/2017-12-16/b_17.svg)
One naive extension to pure binary encoding that supports
storing negative numbers is to
sacrifice MSB (the most significant bit) to represent number sign:
![Naive negative numbers](assets/images/2017-12-16/bsgn.svg)
But this solution comes with its own problems,
for example we will end up with two different
bit patterns that represent the value of zero (`+0` and `-0`).
This also unnecessary complicates CPU design 
(we will need two different circuits to perform unsigned and signed
arithmetic) and reduces the range of
possible values that can be represented within a single byte
(again because zero is now unneccessarily 
represented by two distinct values).

Two's complement encoding solves all these problem.
The main idea is to assign negative weight to the most significat
bit of the number, for example:
![binary representation of -17](assets/images/2017-12-16/u2_17.svg)
The positive numbers have the same representation as they have in
pure binary encoding. There is also a simple procedure to negate a number,
first negate all bits and then add one to the result:
![Twos complement negation](assets/images/2017-12-16/u2_neg.svg)

Above procedure works for all numbers except one - the maximum nagative
value (`-128` for a single byte, `-2147483648` for a 4-byte `int`):
![Twos complement negation](assets/images/2017-12-16/u2_min.svg)
This is the consequence of the fact that 
range of numbers that can be represented using two's complement
is asymetric around zero. For example in a single byte we can
represent values from `-128` up to `127`.

Since we are here it is also worth to mention that we may use
the same addition algorithm to add numbers encoded in pure
binary encoding and in two's complement encoding.
Subtraction is also very easy. Say you want to subtract 
numbers `a` and `b`, you just negate `b` 
(using `NOT` and `INC` instructions) 
and then add it to `a`.

Now let's go back to our algorithm.
Let's assume that we have a number that is a power of two,
such a number has only one bit set. So we may assume that
our number `n` has form:
{% highlight no-highlight %}
0...010...0
{% endhighlight %}
As discussed above arithmetic negation is peformed by first negating all
bits and then adding one, in our case:
{% highlight no-highlight %}
0...010...0
1...101...1 (NOT)
1...110...0 (+1)
{% endhighlight %}
As we can see `n` and `-n` share a single common bit, `AND`ing both
values yields:
{% highlight no-highlight %}
0...010...0  n
1...110...0 -n
AND
0...010...0 = n
{% endhighlight %}
So we ended up with the same value as we started. 
In other words `(n & -n) == n` returns true.
This is illustrated for `n = 32` on the diagram below:
![How algorithm works for n=32](assets/images/2017-12-16/a1_w.svg)

Now consider a number that is not a power of two, such a number
will have at least two bits set (we will deal with zero later).
We will divide number into three parts, the bits before first set
bit on the left, the bits after the last set bit on the right and the
middle bits. 
Let's see what will happen when we use our algorithm on such a number:
{% highlight no-highlight %}
0..01?...?10..0 n
1..10?...?01..1 (NOT)
1..10?...?10..0 (+1) = -n
{% endhighlight %}
I used `?` to mark middle bits that can have any value.
The most important observation is that the leftmost set bit 
in `n` is cleared after negation.

Now let's see what will be returned by `AND`:
{% highlight no-highlight %}
0..01?...?10..0  n
1..10?...?10..0 -n
AND
0..00?...?10..0 != n
{% endhighlight %}
As we can see all bits before `?` are cleared after peforming `AND`
operation. This guarantees that `(n & -n)` expression returns
different value than `n` which has one bit set before `?...?` bits.
And so `(n & -n) == n` returns `false` as expected.

Diagram below illustrates how algorithm works for `n = 36`:
![How algorithm works for n=36](assets/images/2017-12-16/a1_w2.svg)

There are two special values that need more attention.
One is of course zero which is handled explicitly by the condition
`(number > 0)`. The other value is `Integer.MIN_VALUE`.
The `Integer.MIN_VALUE` may be treaded either as a power of two
(it has only single bit in the binary representation) or not. 
This depends on how we want to tread `int` value in Java 
(as a singed number or as an unsigned one).
At the begining we decided that our algorithm accepts negative values
and so `number` is a signed value.
To be consistend we again use `(number > 0)` condition to return
`false` for `Integer.MIN_VALUE`.



#### JavsScript peculiarities
// TODO: Warning JS - numbers are truncated to 32 bits

#### Version of algorithm I for unsigned numbers

