---
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Debugging OpenJDK 8 with NetBeans on Ubuntu
date: 2017-06-24 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post we will learn how to download, compile and debug OpenJDK 8
using Ubuntu and NetBeans IDE.

#### Downloading and compiling OpenJDK 8

[OpenJDK](http://openjdk.java.net/) project uses Mercurial for source
code versioning. To get sources using Mercurial follow instructions described 
[in this SO answer](https://stackoverflow.com/a/29845834/1779504).

To get OpenJDK sources using Git, we need to clone OpenJDK repository mirror
provided by [AdoptOpenJDK project](https://adoptopenjdk.net/about.html).
To speed things up we will only clone `master` branch without commit history:
{% highlight no-highlight %}
$ git clone \
	--depth 1 \
	-b master \
	git@github.com:AdoptOpenJDK/openjdk-jdk8u.git
{% endhighlight %}

Now when we have sources, its time to compile OpenJDK.
First we need to install all required dependencies:
{% highlight no-highlight %}
$ sudo apt install \
        libx11-dev \
        libxext-dev \
        libxrender-dev \
        libxtst-dev \
        libxt-dev \
        libcups2-dev \
        libfreetype6-dev \
        libasound2-dev
{% endhighlight %}
Then we must run `configure` script:
{% highlight no-highlight %}
$ cd openjdk-jdk8u/
$ chmod +x ./configure
$ ./configure \
	--with-debug-level=slowdebug \
	--with-target-bits=64
{% endhighlight %}
We call `configure` with two options:

* `--with-debug-level=slowdebug` - enables generating debug information
 when compiling OpenJDK
* `--with-target-bits=64` - we will generate 64-bit binaries

It may happen than `configure` will return error telling you that you need
to install some additional tool/library. This is something to be expected,
just follow instructions printed by `configure`.
You may need to do this several times until you will 
have all required dependencies installed on your system.

Now it's time to actually build OpenJDK:
{% highlight no-highlight %}
$ make
{% endhighlight %}
This may take some time...
{% highlight no-highlight %}
----- Build times -------
Start 2017-06-24 17:45:26
End   2017-06-24 17:48:53
00:00:12 corba
00:01:25 hotspot
00:00:08 jaxp
00:00:12 jaxws
00:01:13 jdk
00:00:17 langtools
00:03:27 TOTAL
-------------------------
Finished building OpenJDK for target 'default'
{% endhighlight %}

Now we may use our newly built `java` to run "Hello, world!" program:
{% highlight no-highlight %}
$ ./build/linux-x86_64-normal-server-slowdebug/jdk/bin/java \
	-cp "/home/me/dev/java/helloWorld/" \
	App
Hello, world!
{% endhighlight %}

#### Creating project for OpenJDK 8 in NetBeans

You need to [download](https://netbeans.org/downloads/)
and install NetBeans IDE. Since HotSpot is written in C++ we will need
NetBeans with C/C++ support.

Now it is time to create project for OpenJDK in NetBeans.
Select File->New Project...->C/C++ Project with Existing Sources...
![New project dialog window.](assets/images/2017-06-24/new_proj.png)

Then select "Custom" configuration mode:
![New project dialog window 2 step.](assets/images/2017-06-24/new_proj2.png)

We must use the same `configure` arguments that we used on command line:
![Configure options.](assets/images/2017-06-24/new_proj3.png)

Now click "Next" a few more times and then click "Finish".
NetBeans should now run `configure` and build OpenJDK, you should
see compiler output in Build tab:
![Build window.](assets/images/2017-06-24/new_proj4.png)

After build ends you should see output similar to:
{% highlight no-highlight %}
----- Build times -------
Start 2017-06-24 18:07:15
End   2017-06-24 18:11:17
00:00:14 corba
00:01:45 hotspot
00:00:08 jaxp
00:00:13 jaxws
00:01:22 jdk
00:00:20 langtools
00:04:02 TOTAL
-------------------------
Finished building OpenJDK for target 'default'

BUILD SUCCESSFUL (total time: 4m 2s)
{% endhighlight %}

Now we should try to run our "Hello, World!" program from NetBeans.
Click on project and then select "Properties":
![Run command.](assets/images/2017-06-24/run_1.png)
Then go to "Run" category and click on "..." next to "Run command", then
write any command that you want to run. Assume that `"${OUTPUT_PATH}"`
refers to `java` binary:
![Run command step 2.](assets/images/2017-06-24/run_2.png)

Now select Run->Run Project, NetBeans will ask you what binary you want to
run, select `java`:
![Run command step 3.](assets/images/2017-06-24/run_3.png)

Now you should see "Hello, world!" written in Output window:
![Run command step 4.](assets/images/2017-06-24/run_4.png)

#### Debugging with NetBeans

Call to `System.out.println(...)` in Java will ultimately be handled
by `writeBytes` function in `jdk/src/share/native/java/io/io_util.c` file
(this is only valid for Linux builds of OpenJDK).

Lets put a breakpoint inside that function and see what will happen when we
try to debug Hello world program:
![Debug step 1.](assets/images/2017-06-24/debug_1.png)

Select Debug->Debug Main Project. After executing this command you
may see window:
![Debug step 2.](assets/images/2017-06-24/debug_2.png)
JVM uses `SIGSEGV` for its internal purposes, from our point of view
we may just ignore it (select "Don't Catch this Singla Again" and 
"Forward and Continue"). After a few seconds we should be able to
catch a breakpoint and see what JVM is doing:
![Debug step 3.](assets/images/2017-06-24/debug_3.png)

And that's it! 
Now you will be able to check and understand how JVM is working under cover.

#### References

* [http://marcelinorc.com/2016/02/17/using-netbeans-to-hack-openjdk9-in-ubuntu/](http://marcelinorc.com/2016/02/17/using-netbeans-to-hack-openjdk9-in-ubuntu/)
* [https://neugens.wordpress.com/2015/02/26/debugging-the-jdk-with-gdb/](https://neugens.wordpress.com/2015/02/26/debugging-the-jdk-with-gdb/)
* [https://github.com/AdoptOpenJDK/openjdk-build](https://github.com/AdoptOpenJDK/openjdk-build)

