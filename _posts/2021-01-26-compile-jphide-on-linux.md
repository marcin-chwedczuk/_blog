---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: 'CTF Time: Compile JPHide on Kali Linux'
date: 2021-01-25 00:00:01
tags: ctf jvmbloggers
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I started participating in CTF (capture the flag) games.
One of the challenges that I needed to solve, was to recover a
message hidden in a JPEG file.
To solve this challenge I needed an old steganography tool called `jphide`.

The tool is no longer maintained, but you can still find copies of its source
code on Github, e.g. [h3xx/jphs](https://github.com/h3xx/jphs).

Let's see how we can compile it on a "stock" Kali Linux image.
BTW The best way to start with Kali Linux is to grab
images from [offensive-security.com](https://www.offensive-security.com/kali-linux-vm-vmware-virtualbox-image-download/) site and load them into
VM Ware Player or VirtualBox. The default user:password is `kali:kali`.

TIP Since I got addicted to iTerm2, I often prefer to SSH into Kali VM from iTerm2
instead of using Kali itself. Stock Kali comes with a preinstalled SSH server,
we just need to enable it with `sudo service ssh start`.

OK finally its time to compile jphide:
{% highlight shell %}
$ git clone --depth 1  https://github.com/h3xx/jphs
{% endhighlight %}

First we need to compile `jpeg-8a` library:
{% highlight shell %}
$ cd jphs/jpeg-8a
$ ./configure
$ make all
{% endhighlight %}
After compilation, a new folder called `.libs` should be created:
{% highlight shell %}
$ ls .libs/lib*
.libs/libjpeg.so  .libs/libjpeg.so.8  .libs/libjpeg.so.8.0.1
$ cd .. # we are done here
{% endhighlight %}

Because we do not installed `libjpeg.so.8` system-wide we need
to modify `Makefile` before we can compile the main program:
{% highlight diff %}
diff --git a/Makefile b/Makefile
index c772c68..c1d6871 100644
--- a/Makefile
+++ b/Makefile
@@ -15,8 +15,8 @@ JP_CFLAGS = $(CFLAGS_COMMON) \
            -I./jpeg-8a
 BF_CFLAGS = $(CFLAGS_COMMON)

-LIBS = -ljpeg
-LDFLAGS = $(LIBS)
+LDFLAGS = -L./jpeg-8a/.libs
+LDLIBS = -ljpeg

 ## programs
 INSTALL = install

{% endhighlight %}

As a side note let's notice that author of this `Makefile` made a cardinal sin
of linking: never, Never, NEVER put linked libraries into `LDFLAGS`. Always pass them
to linker using `LDLIBS` variable.

After patching `Makefile` we are ready to build the tools:
{% highlight shell %}
$ make clean
$ make
$ ./jphide

jphide, version 0.3 (c) 1998 Allan Latham <alatham@flexsys-group.com>

This is licenced software but no charge is made for its use.
NO WARRANTY whatsoever is offered with this product.
NO LIABILITY whatsoever is accepted for its use.
You are using this entirely at your OWN RISK.
See the GNU Public Licence for full details.

Usage:

jphide input-jpg-file output-jpg-file hide-file
{% endhighlight %}

