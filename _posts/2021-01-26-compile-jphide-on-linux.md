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

Because we have not installed `libjpeg.so.8` system-wide we need
to modify `Makefile` before we can compile the main program:
{% highlight diff %}
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

To patch the `Makefile` just save the diff as e.g. `patch1` and
then execute `patch < patch1` in `jphs` directory.

After patching `Makefile` we are ready to build the tools:
{% highlight shell %}
$ make clean
$ make
{% endhighlight %}

On some systems you may encounter a compilation problem on line
208 of `jpseek.c`:
{% highlight c %}
if ((f = open(seekfilename,O_WRONLY|O_TRUNC|O_CREAT)) < 0)
{% endhighlight %}
You can fix it by adding a third parameter to `open` call:
{% highlight c %}
if ((f = open(seekfilename,O_WRONLY|O_TRUNC|O_CREAT, 0644)) < 0)
{% endhighlight %}

EDIT: I forgot to mention this in the original post.
Because we did not installed `jpeg-8a` library system wide,
we need to set `LD_LIBRARY_PATH` variable:
{% highlight shell %}
$ export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(realpath ./jpeg-8a/.libs/)
$ echo $LD_LIBRARY_PATH
:/home/kali/jphs/jpeg-8a/.libs
{% endhighlight %}
Now the program should run without any problems:
{% highlight shell %}
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

## Bonus - cracking mode

Because during CTF you often have to crack the password using
`/usr/share/dict/words` or `rockyou.txt` lists, its convenient
to have `jpseek` version that can quickly check which passwords
are good candidates for further analysis.

{% highlight shell %}
$ cp jpseek.c jpcrack.c
{% endhighlight %}

<b>The patch assumes that you have added the third parameter to the `open` call.</b>
{% highlight shell %}
$ patch jpcrack.c crack-patch
{% endhighlight %}

And here is the `crack-patch` itself:
{% highlight diff %}
--- jpseek.c
+++ jpcrack.c
@@ -6,12 +6,11 @@
  * Use permitted under terms of GNU Public Licence only.
  *
  */
-
+#define _GNU_SOURCE
 #include <stdio.h>
 #include <string.h>
 #include <stdlib.h>
 #include <ctype.h>
-#include <fcntl.h>
 #include <unistd.h>
 #include <getopt.h>
 #include <errno.h>
@@ -20,11 +19,13 @@
 #include <sys/time.h>		
 #include <sys/resource.h>		
 #include <sys/stat.h>		
+#include <fcntl.h>
 #include "bf.h"
 #include "cdjpeg.h"
 #include "version.h"
 
 #define NKSTREAMS 4
+#define PASSLEN 120
 
 static jvirt_barray_ptr * coef_arrays;
 static unsigned int  cpos[NKSTREAMS];
@@ -187,10 +188,10 @@
 
 
 static int jpseek (const char* infilename,
-                   const char* seekfilename)
+		   const char* pass)
 {
+ int result = 0;
  int b,count,i,j,len0,len1,len2;
- char *pass;
  unsigned char iv[9];
  unsigned char v;
  struct jpeg_decompress_struct srcinfo;
@@ -201,14 +202,10 @@
 
  input_file = fopen(infilename,"r");
  if (input_file == NULL) {
-  perror("Can't open input file");
-  return (1);
+	perror("Can't open input file");
+	exit(2);
  }	
 
- if ((f = open(seekfilename,O_WRONLY|O_TRUNC|O_CREAT, 0644)) < 0) {
-  perror("Can't open seek file");
-  return (1);
- }
 
  srcinfo.err = jpeg_std_error(&jsrcerr);
  jpeg_create_decompress(&srcinfo);
@@ -232,14 +229,9 @@
   iv[i] = (((short**)(((void**)(((void**)coef_arrays)[0]))[0]))[0])[i]; 
  }
 
- pass = getpass("Passphrase: ");
- if (strlen(pass) == 0) {
-  fprintf(stderr,"Nothing done\n");
-  exit(0);
- }  
  if (strlen(pass) > 120) {
   fprintf(stderr,"Truncated to 120 characters\n");
-  pass[120] = 0;
+	exit(3);
  }
 
  Blowfish_ExpandUserKey(pass,strlen(pass),bkey);
@@ -266,8 +258,8 @@
   v = 0;
   for(j=0;j<8;j++) {
    if ((b = get_bit()) < 0) {
-    fprintf(stderr,"File not completely recovered\n");
-    exit(1);
+	result = 1;
+	goto end;
    }
    b = b << j;
    v |= b;
@@ -291,25 +283,27 @@
  while(count < length) {
   for(j=0;j<8;j++) {
    if ((b = get_bit()) < 0) {
-    fprintf(stderr,"File not completely recovered\n");
-    exit(1);
+	result = 1;
+	goto end;
    }
    b ^= get_code_bit(1);
    v = v << 1;
    v |= b;
    tail--;
   }
-  write(f,&v,1);
+  //write(f,&v,1);
   count++;
  }
 
+end:
+
  jpeg_finish_decompress(&srcinfo);
  jpeg_destroy_decompress(&srcinfo);
 
- close(f);
+ //close(f);
  fclose(input_file);
 
- return(0);
+ return result;
 
 }
 
@@ -332,14 +326,40 @@
 static void usage()
 {
  fprintf(stderr,"Usage:\n\n\
-jpseek input-file seek-file\n\n");
+jpseek input-file passwords-list-file\n\n");
  exit(1);
 }
 
 int main(int argc, char **argv)
 {
- intro();
- if (argc != 3) usage();
- return (jpseek(argv[1],argv[2]));
+ if (argc != 3) { 
+   usage(); exit(10);
+}
+
+ char buff[128] = {0};
+
+ FILE* pass_file = fopen(argv[2],"r");
+ if (pass_file == NULL) {
+	perror("Can't open passwords file");
+	exit(20);
+ }	
+
+ long counter = 0;
+ while (fgets(buff, 120, pass_file) != NULL) {
+	// get rid of \n
+	buff[strcspn(buff, "\n")] = 0;
+	counter++;
+
+	printf("[trying=%s]\n", buff);
+	if (jpseek(argv[1], buff) == 0) {
+		puts(buff);
+	}
+
+	if ((counter % 100000) == 0) {
+		fprintf(stderr, "(stderr) currently at %s\n", buff);
+	}
+ }
+
+ return 0;
 }
{% endhighlight %}

And finally the diff for `Makefile`:
{% highlight diff %}
-- Makefile.orig	2021-01-31 08:49:57.904938275 -0500
+++ Makefile	2021-01-31 08:50:12.068602369 -0500
@@ -1,6 +1,7 @@
 # variables
 HDOBJECTS = jphide.o bf.o
 SKOBJECTS = jpseek.o bf.o
+CROBJECTS = jpcrack.o bf.o
 
 ## flags
 CFLAGS_COMMON = -O2
@@ -29,19 +30,21 @@
 BINDIR = $(PREFIX)/bin
 
 # targets
-TARGETS = jphide jpseek
+TARGETS = jphide jpseek jpcrack
 all: $(TARGETS)
 jphide: $(HDOBJECTS)
 jpseek: $(SKOBJECTS)
+jpcrack: $(CROBJECTS)
 
 # object rules
 bf.o:			CFLAGS=$(BF_CFLAGS)
-jphide.o jpseek.o:	CFLAGS=$(JP_CFLAGS)
+jphide.o jpseek.o jpcrack.o:	CFLAGS=$(JP_CFLAGS)
 
 # dependencies
 bf.c: bf.h bf_config.h
 jphide.c: ltable.h version.h bf.h
 jpseek.c: ltable.h version.h bf.h
+jpcrack.c: ltable.h version.h bf.h
 
 # other targets
 clean:

{% endhighlight %}

## Demo time

Let's hide a message in a cat picture:
{% highlight shell %}
$ wget https://upload.wikimedia.org/wikipedia/commons/4/4b/Domestic_Cat_Demonstrating_Dilated_Slit_Pupils.jpg -O cat.jpg
$ echo "very secret message" > msg.txt
$ ./jphide cat.jpg flag.jpg msg.txt
# Enter password
$ cat passlist.txt                   
cat
dog
abcd
1234
$ ./jpcrack flag.jpg passlist.txt 
[trying=cat]
[trying=dog]
[trying=abcd]
abcd
[trying=1234]
# Looks like 'abcd' is a good candidate
$ ./jpseek flag.jpg out.txt
$ cat out.txt
very secret message
{% endhighlight %}
You can get rid of `[trying...` text by commenting appropriate `printf`
in the `jpcrack.c`.
