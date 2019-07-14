---
author: mc
layout: post
cover: 'assets/images/mc_cover1.jpg'
title: PowerShell function declaration pitfall
date:   2016-07-15 00:00:00
tags: powershell
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I had to write some scripts in PowerShell.
Because I try to follow good software development practices I decided to split
script logic into functions. First I defined a few functions
that taken or returned single value:
{% highlight powershell %}
function printArg($arg1) {
    write-host "printArg: arg1=$arg1";
}
    
function transformArg($n) {
    return $n*$n
}
{% endhighlight %}
Of course they worked brilliantly:
{% highlight powershell %}
> printArg(1)
printArg: arg1=1
    
> printArg("foo")
printArg: arg1=foo
    
> write-host $(transformArg(3))
9
{% endhighlight %}
But then I needed to declare function that takes three arguments,
I started with code:
{% highlight powershell %}
function manyArgs($arg1, $arg2, $arg3) {
    write-host "manyArgs: arg1=$arg1, arg2=$arg2, arg3=$arg3"
}
{% endhighlight %}
Unfortunatelly it didn't work as expected:
{% highlight powershell %}
> manyArgs(1, 2, 3)
manyArgs: arg1=1 2 3, arg2=, arg3=
{% endhighlight %}
After a bit of research
it turned out that PowerShell ***uses space as argument separator***.
So to pass three arguments we need to write:
{% highlight powershell %}
> manyArgs 1 2 3
manyArgs: arg1=1, arg2=2, arg3=3
    
# or using more verbose syntax:
> manyArgs -arg1 1 -arg2 2 -arg3 3
manyArgs: arg1=1, arg2=2, arg3=3
{% endhighlight %}
This also works with single argument functions:
{% highlight powershell %}
> printArg 1
printArg: arg1=1
    
> printArg -arg1 1
printArg: arg1=1
{% endhighlight %}
Before we end let's find out what exactly is `(1, 2, 3)` 
and why calling `printArg(1)` works. 
It turns out that
`(a, b, ..., z)` expression represents array of objects in PowerShell:
{% highlight powershell %}
> (1, 2, 3).getType().name
Object[]
{% endhighlight %}
And `(x)` expression represents just `x` value :   
{% highlight powershell %}
> (1).getType().name
Int32
{% endhighlight %}
and thats explain outputs of `printArg(1)` and `manyArgs(1, 2, 3)` command.

This behaviour of PowerShell may be surprising for C# programmers,
I hope this post will help you remember about this problem.

