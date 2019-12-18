---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Binary to Gray algorithm explained
date: 2019-12-17 00:00:01
tags: algorithms
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Binary to Gray code conversion algorithm is deceptively simple:
{% highlight cpp %}
/* This function converts an unsigned binary
 * number to reflected binary Gray code.
 *
 * The operator >> is shift right. The operator ^ is exclusive or.
 *
 * Source: https://en.wikipedia.org/wiki/Gray_code
 */
unsigned int binaryToGray(unsigned int num) {
    return num ^ (num >> 1);
}
{% endhighlight %}
in this article I will explain how it works.

#### Gray code 

Gray code is a binary code in which two consecutive
numbers differ only by a single bit.
Three-bit Gray code along its binary counterpart
looks like this:
{% highlight no-highlight %}
|         BINARY|           GRAY|
|            000|            000|
|            001|            001|
|            010|            011|
|            011|            010|
|            100|            110|
|            101|            111|
|            110|            101|
|            111|            100|
{% endhighlight %}

N+1-bit Gray code can be easily constructed
from N-bit Gray code using the following process:

![Making N+1-bit Gray code from N-bit Gray code](assets/images/2019-12-17/gn1.svg)

This also explains why this variant of Gray code is
often called reflected binary Gray code.
The "Vertical Flip" step is nothing else than creating
a mirror image of the code in vertical direction.

The above process with the fact that 1-bit Gray code is
just `0` and `1` allows us to write a recursive algorithm
for converting binary to Gray.

#### Recursive algorithm

I will use pseudocode here. We will define a function
`G(nbits, n)` that returns `nbits`-bit Gray code counterpart
for number `n`. `n` must, of course, be in range `0` .. `2**(nbits-1)`
(where `**` means power).
For `nbits` equal to 1 this is trivial:
{% highlight no-highlight %}
func G(nbits, n) {
   if (nbits <= 1) return n;
   ???
}
{% endhighlight %}
In other words we return `0` when `n` is zero, and one when
`n` is one.

Next we need to translate the process from the picture above
into code:
{% highlight no-highlight %}
var msbBit = msb(nbits, n)

if (msbBit == 0) {
  return msbBit | G(nbits-1, n); 
}
else {
  // clear MSB bit
  var nWithoutMsb = n & ~msbBit;
  var nonReflectedPos = pow(2, nbits-1)-1 - nWithoutMsb;

  return msbBit | G(nbits-1, nonReflectedPos)
}
{% endhighlight %}
Where `msb` is a simple function that returns
the _most significant bit_ (MSB for short) of
an `nbits`-bit number `n`:
{% highlight no-highlight %}
func msb(nbits, n) {
	return n & (1 << (nbits-1));
}
{% endhighlight %}
In the following disucssion, similarly we will use 
LSB to refer to _least significant bit_ of a number.

There are two key observations that we must make to
understand how the algorithm works.
First observation is that binary values
share the same value of MSB bit with the corresponding
Gray code values.
![MSB and LSB in our algorithm](assets/images/2019-12-17/g2.svg)
This is the result of the construction process,
that adds leading zeros to the blue/upper half of the Gray code
values and leading ones to the red/lower half of the code.

When `MSB = 0` we are in the blue part of the `nbits`-bit
Gray code, which was constructed from the `nbits-1`-bit Gray
code by adding extra `0` as a prefix to its values.
In this case we just call recursively `G(nbits-1, n)`
(`n` is in this case `n < 2**nbits/2 = 2**(nbits-1)`),
and add a `0` as a prefix to the result to
finish the conversion to `nbits`-bit code.

When `MSB = 1` we are in the red part of the code, that
was constructed by vertically flipping `nbits-1`-bt Gray
code and adding `1` as a prefix to its values.
![Relation between simple and reflected code](assets/images/2019-12-17/g3.svg)
The second key observation here, is the relationship between
reflected `nbits-1`-bit Gray code and its non-reflected counterpart.
`nbits-1`-bit Gray value that is located
at `x`th position in the red (reflected)
area is exactly the same as 
`2**(nbits-1)-1 - x`th value located in the blue area.
To convert `n` into `nbits-1` Gray code, first
we remove `1` MSB bit from it, converting
it basically into our `x`
(zero-based offset from the beginning of the red area).
Then we compute `x`s counterpart position in
the non-reflected code part, using expression:
{% highlight no-highlight %}
var nonReflectedPos = pow(2, nbits-1)-1 - nWithoutMsb;
{% endhighlight %}
Then we call `G(nbits-1, nonReflectedPos)` to
compute `nbits-1` Gray value and finally we
restore `1` bit prefix.

The above algorithm expressed in Java:
{% highlight java %}
private static int msb(int nbits, int n) {
	return n & (1 << (nbits-1));
}

private static int G(int nbits, int n) {
	if (nbits <= 1) return n;

	int msbBit = msb(nbits, n);
	if (msbBit == 0) {
		// We can skip 'msbBit |' part because
		// '(0 | x) == x'
		return msbBit | G(nbits-1, n);
	}
	else {
		int nWithoutMsb = n & ~msbBit;
		int nonReflectedPos = 
			(int)Math.pow(2, nbits-1)-1 - nWithoutMsb;
		return msbBit | G(nbits-1, nonReflectedPos);
	}

{% endhighlight %}

#### Using Strings to represent binary values

To further improve our algorithm we need to change
our representation of binary values from 32-bit integers
to strings. E.g. a string `"110"` will represent
a 3-bit binary value. We will also use empty string
`""` to represent a zero-bit binary value
(after all `2**0 = 1`, so there is one such value).

Lets make another key observation here:
numbers in form `2**k - 1` are represented in
binary by sequence of `k` ones.
For example `2**3-1 = 7` is `111` in binary.

Substracting `k`-bit value `p` from `1...1` (`k` ones)
is equal to negating `p`:
{% highlight no-highlight %}
  11111111
- 01010011
----------
  10101100
{% endhighlight %}

These both facts will allow us to rewrite
expression for computing `nonReflectedPos` from:
{% highlight no-highlight %}
// n is a nbits-bit number
// nWithoutMsb is a (nbits-1)-bit number
// 2**(nbits-1)-1 = 1...1 (nbits-1 ones in binary)
int nonReflectedPos = 
	(int)Math.pow(2, nbits-1)-1 - nWithoutMsb;
{% endhighlight %}
into
{% highlight no-highlight %}
String nonReflectedPos = not(nWithoutMsb);
{% endhighlight %}

Our previous algorithm converted to use Strings
and expressed in JavaScript:
{% highlight js %}
function not(bits) {
  return bits.split('').
    map(function(c) { return c == '0' ? '1' : '0'; }).
    join('')
}

function G(b) {
  if (b === '') return ''; // zero bit code
  
  var firstBit = b.charAt(0);
  if (firstBit == '0') {
    return '0' + G(b.substring(1));
  }
  else {
    return '1' + G(not(b.substring(1)));
  }
}
{% endhighlight %}

#### The single-line algorithm

If look at the code of our simplified algorithm, we
can see that all it does is to negate unseen rest of the
input every time we see `1`:
![Workings of the string based algorithm](assets/images/2019-12-17/g4.svg)

Now let's consider how our algorithm will transform
groups of ones followed by a single zero bit (`11...110`):
![How groups of 11...110 are transformed](assets/images/2019-12-17/g5.svg)
As we can see group of `11...110` bits is changes into `10...01`,
but what is more imports bits that are after this group are unchanged.
Similarly groups of ones (`1...1`) that may only occur on the end
of the input are transformed into `10...0`.

Now is the time for another key observation: the above
operations can be performed by xoring value with
itself shifted right by one:

![How XORing works](assets/images/2019-12-17/g6.svg)

This works because after the sift every group of ones must
be preceeded by at least one zero bit. Also every group of ones
(except when the ones are grouped at the end of the input)
must be followed by at least a single zero bit.
In other words different groups of ones are not interfering with
each other.

Also notice that we must use shift operation that always
shifts-in a zero bit.
In Java this means using `>>>` (unsigned right shift) 
instead of `>>` operator.
{% highlight java %}
int binaryToGray(int num) {
    return num ^ (num >>> 1);
}
{% endhighlight %}

Source code (GitHub Gist): [grayBin.js](https://gist.github.com/marcin-chwedczuk/efc4df9fbc1928afcb0466e34b3d94c3)

