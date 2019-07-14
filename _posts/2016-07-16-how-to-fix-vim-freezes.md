---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: How to fix Vim freezes
date:   2016-07-16 00:00:00
tags: vim 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

When I switched from Visual Studio to using Vim I often experienced
Vim freezes. This was really annoying. At the beginning I was thinking
that maybe I installed too many plugins 
(using [Vundle](https://github.com/VundleVim/Vundle.vim)) or that
Vim is not as good as they say. 

After a few weeks an
idea come to my mind, I noticed that I have a subconscious habit of
pressing `Ctrl+S` when editing a file. But hey `Ctrl+S` has
special meaning for Linux terminal, it's a terminal scroll lock - 
basically it freezes program that wants to write to standard output/error.
To unfreeze program you must press `Ctrl+Q`.

You can use this Bash one-liner to check how it works:
{% highlight bash %}
for i in {1..100}; do echo "$i"; sleep 0.3; done
{% endhighlight %}

It still happens from time to time that I press `Ctrl+S` while using
Vim (old habits die hard), but now I just press `Ctrl+Q` and continue
my work. So far I have never experienced a real Vim freeze again.

##### Note for Windows users
Terminal scroll lock also works in Windows but there you use
`Ctrl+S` both to freeze and to unfreeze a program.


