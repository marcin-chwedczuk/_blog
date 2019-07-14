---
author: mc
layout: post
cover: 'assets/images/cover8.jpg'
title: Iterative solution to Towers of Hanoi problem
date:   2016-11-26 00:00:00
tags: algorithms
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Towers of Hanoi is a simple programming riddle often used 
in programming courses to
introduce recursion.
Not many people are aware that Towers of Hanoi has
also a beautiful iterative solution.

Here I assume that you already know this problem if not 
[please check Wikipedia Tower of Hanoi page](https://en.wikipedia.org/wiki/Tower_of_Hanoi).

The key to discover how iterative algorithm work is to actually observe how
disks are moved by recursive algorithm.
To make move patterns more visible we will put rots 
on a circle, we will be moving discs from rot marked by FROM label to
rot marked by TO label using third rot only to temporary store discs.
We will use animation below to
observe how disks move. We will start by observing how the smallest disk (red)
is moving when total number of disk is even (so try it for 2, 4, 6 and 8 disks).
After you find the pattern how smallest disk moves try to find out how other
disk are moving - this should not be difficult.
Then repeat observation for odd number of disks (1,3,5 and 7).  
TIP: Patterns may be more easily revealed when you use x3 or x5 animation speed

<iframe src="assets/apps/hanoi/index.html" 
	width="850" height="810"
	style="border:none; margin-left:-48px; margin-top:-20px;"></iframe>


<p style="color: gray;">
Scroll below when you have enough of pattern finding or if want to check if
your patterns are correct.
</p>

For any number of disks we start by moving the smallest disk.
For even total number of disks we move the smallest disk clockwise for
odd total number of disks we move the smallest disk counterclockwise.
After every move that involves the smallest disk we perform one
valid move 
(we move smaller disk on top of bigger, or we move disk to empty rod)
that doesn't involve the
smallest disk. We stop when all disks were moved to TO rod.

Formal proof that above algorithm works can be found in 
[The Associativity of Equivalence and the Towers of Hanoi Problem](http://www.cs.nott.ac.uk/~psarb2/MPC/Hanoi.ps.gz).

Iterative algorithm implemented in JavaScript:
{% highlight javascript %}
var generateHanoiMovesIterative = function(numberOfDisks) {
  // direction of rotation of the smallest disk
  var dir = (numberOfDisks % 2 === 0) ? 1 : -1;

  var rods = [[], [], []];
  var i, rodMin;

  // push disks on our virtual rod's
  for (i = 0; i < numberOfDisks; i += 1) {
    rods[0].push(numberOfDisks - i);
  }

  // rodMin will point to rod with smallest disk
  rodMin = 0;

  // we need (2^numberOfDisks - 1) moves
  var numberOfMoves = (1 << numberOfDisks) - 1;

  // To avoid using % operator we precompute next and prev tables
  var next = [1, 2, 0];
  var prev = [2, 0, 1];

  var moves = [];
  var moveSmallest = true;

  for (i = 0; i < numberOfMoves; i++) {
      if (moveSmallest) {
        var oldRodMin = rodMin;
        // in JS -1 % 3 === -1, we add 3 to get positive result
        rodMin = (oldRodMin + dir + 3) % 3;

        moveDisk(oldRodMin, rodMin);
      }
      else {
        if (topDiskSize(next[rodMin]) > topDiskSize(prev[rodMin])) {
          moveDisk(prev[rodMin], next[rodMin]);
        }
        else {
          moveDisk(next[rodMin], prev[rodMin]);
        }
    }
    moveSmallest = !moveSmallest;
  }

  return moves;

  function topDiskSize(rodIndex) {
    if (rods[rodIndex].length === 0) return Number.MAX_VALUE;

    var rod = rods[rodIndex]
    return rod[rod.length-1];
  }

  function moveDisk(from, to) {
    // 1-FROM ROD, 2-USING ROD, 3-TO ROD
    moves.push([from+1, to+1].join(' -> '));
    rods[to].push(rods[from].pop());
  }
};
{% endhighlight %}

References:

* [1] [The Associativity of Equivalence and the Towers of Hanoi Problem](http://www.cs.nott.ac.uk/~psarb2/MPC/Hanoi.ps.gz)

