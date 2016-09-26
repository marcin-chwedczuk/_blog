---
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: Obfuscating windows batch files using undefined environmental variables
date:   2016-09-26 00:00:00
tags: Windows cmd.exe 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will present an old trick from mid 90s used by hackers to 
[obfuscate](https://en.wikipedia.org/wiki/Obfuscation_(software))
code stored in Windows `.bat` files. The trick is simple and works on all versions
of Windows up to Windows 10.

Let's start with a simple command:
{% highlight no-highlight %}
> echo %TIME%
18:50:43.39
{% endhighlight %}
As we can see `cmd.exe` expands all environmental variables
to their values before executing command.
What will happen when we try to use a variable that is not defined, let's try:
{% highlight no-highlight %}
> echo %foo%
%foo%
{% endhighlight %}
When `cmd.exe` cannot resolve variable it just gives up and passes
text `%foo%` to the command. Let's try this again but this time
inside `.bat` file:
{% highlight no-highlight %}
> type test1.bat
@echo off
echo %foo%

> test1

{% endhighlight %}
As we can see nothing was printed, so inside `.bat` files undefined
environmental variables are expanded to empty strings.
Since `cmd.exe` allows using variables inside
command names like this:
{% highlight no-highlight %}
e%var1%cho%var2% "Hello, world!"
{% endhighlight %}
we may use this trick to obfuscate commands stored inside `.bat` files!

So actual algorithm goes like this:

1. Choose some set of environmental variables that you are certain are
 not defined on most of the machines e.g. single or two letter variables like
 `%aa%`, `%bz%`, `%d%`
2. Insert random variable from point 1 every character or two 
 of every command stored inside `.bat` file
3. Do not insert environmental variables inside other variables, transforming
 `%windir%` into `%win%a%dir%` won't work

Using this trick we may change this obvious and innocent looking `.bat` file:
{% highlight no-highlight %}
@echo off
echo "Hello, world!"
{% endhighlight %}
into monstrous:
{% highlight no-highlight %}
@%n%e%x%c%s%h%z%o%f% o%d%f%d%f
e%n%c%o%h%n%o %n%H%p%e%n%l%o%l%o%o%o%,%o% w%c%o%n%r%p%l%k%d%e%!%s%
{% endhighlight %}
As a bonus since expansion will not work on command prompt just copying and pasting lines
from `.bat` file won't work, this give us additional layer of "security".

