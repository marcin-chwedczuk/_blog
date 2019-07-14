---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: A closer look at Portable Executable MS-DOS Stub
date: 2017-11-18 00:00:00
tags: low-level 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

When we open native or .NET windows executables in a hex-editor
we can notice that almost all of them contains strange
"This program cannot be run in DOS mode" text at the beginning of the file.
The original purpose on this text and surrounding it small
MS-DOS program, called MS-DOS stub is to print message to
the user and then exit if the `.exe` file is run from under MS-DOS.
I in this blog post I will explain how it works and since
currently I have only GNU/Linux boxes in my flat I will 
investigate using only Linux.

First we must obtain some `.exe` files. We can create .NET executable
using [Mono Project](http://www.mono-project.com/download/#download-lin):
{% highlight no-highlight %}
$ cat HelloWorld.cs 
using System;

public class Program {
    public static void Main() {
        Console.WriteLine("Hello, world!");
    }
}

$ mcs HelloWorld.cs 

$ mono HelloWorld.exe 
Hello, world!
{% endhighlight %}
Native executable can be created using 
[MinGW](https://stackoverflow.com/a/38788588/1779504)
cross-compiler:
{% highlight no-highlight %}
$ cat main.c 
#include <stdio.h>

int main(int argc, char* argv[]) {
    printf("Hello, world!\n");
    return 0;
}

$ i686-w64-mingw32-gcc -o main64.exe main.c 

$ wine main64.exe 
Hello, world!
{% endhighlight %}

Now when we have a .NET and a 64-bit `.exe` files we may look at
them using hex-editor
(I will use [Bless](https://github.com/bwrsandman/Bless) here):
![.NET executable viewed using hex-editor](assets/images/2017-11-18/hex_hello_world_exe.png)
![Native executable viewed using hex-editor](assets/images/2017-11-18/hex_main64_exe.png)
MS-DOS Stubs in both files looks very similar. This is quite unexpected
because we used two completely different compilers to create them.
Let's confirm our assumptions first by extracting MS-DOS Stubs and then
by comparing them.

In case of both files MS-DOS Stubs end on 0x80 offset.
At that offset we can see "PE" letters 
that mark start of PE headers
("PE" means Portable Executable, this is
the name of `.exe` file format used by Windows).
These letters are often called a Magical Number or a file signature.
This is similar to MZ letters that are always present at the
beginning of MS-DOS executables.

To extract stubs we must copy first 0x80 bytes (0x80 = 8*16 = 128)
of `.exe` files. Then we may compare them:
{% highlight no-highlight %}
$ dd if=nativeexe/main64.exe \
    of=native-msdos-stub.exe \
    bs=1 count=$((8*16))
$ dd if=dotnetexe/HelloWorld.exe \
    of=dotnet-msdos-stub.exe \
    bs=1 count=$((8*16))

# diff can only compare text files. We must convert
# our binary MS-DOS Stubs to hex using xxd command first:
$ diff <(xxd native-msdos-stub.exe) <(xxd dotnet-msdos-stub.exe) \
    | colordiff
# No output means no changes
{% endhighlight %}
So indeed MS-DOS Stubs are identical.

Now just for the sake of doing it I will grab DOSBox and check
if these subs are working:
{% highlight no-highlight %}
$ sudo apt install dosbox
$ dosbox
{% endhighlight %}
After DOSBox starts we must mount our directory with `.exe` files
as `C:` disk:
{% highlight no-highlight %}
Z:\> mount c /home/user/path_to_exe_files
Z:\> C:
C:\> REM And we are done!
{% endhighlight %}

![DOSBox main window](assets/images/2017-11-18/dosbox1.png)

We may use `CLS` command to clear the screen and attempt to
run our `.exe` files. For those that never used MS-DOS, this
system supports only short files names (eight letters for file name plus
three letters for extension, so called `8.3` format).
That is why our `HelloWorld.exe` is displayed as `HELLOW~2.EXE`.
![DOSBox main window](assets/images/2017-11-18/dosbox2.png)

Everything works as expected. But that is not all of it.
Instead of our `.exe` files we may run our extracted MS-DOS Stubs and
they also work without any problems:
![DOSBox main window](assets/images/2017-11-18/dosbox3.png)
This suggest that MS-DOS Stubs are just tiny MS-DOS EXE programs
(in MZ format) embedded in PE files.

To confirm that assumption we must look under the cover.
Let's start by dumping values of MS-DOS COM header:
{% highlight no-highlight %}
     e_magic: 4d 5a            // Magic number 'MZ'
      e_cblp: 0x0090           // Bytes on last page of file
        e_cp: 0x0003           // Pages in file
      e_crlc: 0x0000           // Relocations
   e_cparhdr: 0x0004           // Size of header in paragraphs
  e_minalloc: 0x0000           // Minimum extra paragraphs needed
  e_maxalloc: 0xffff           // Maximum extra paragraphs needed
        e_ss: 0x0000           // Initial (relative) SS value
        e_sp: 0x00b8           // Initial SP value
      e_csum: 0x0000           // Checksum
        e_ip: 0x0000           // Initial IP value
        e_cs: 0x0000           // Initial (relative) CS value
    e_lfarlc: 0x0040           // File address of relocation table
      e_ovno: 0x0000           // Overlay number
       e_res: 00 00 00 00 00 00 00 00 
                               // Reserved
     e_oemid: 0x0000           // OEM identifier (for e_oeminfo)
   e_oeminfo: 0x0000           // OEM information; e_oemid specific
      e_res2: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 
                               // Reserved
    e_lfanew: 0x00000080       // File address of the new exe header
{% endhighlight %}
To extract these values I wrote a small Java program. Source code is
available as a [GitHub Gist here](https://gist.github.com/marcin-chwedczuk/bc050b8feddb50f29cd5bf83e5f843c4).

All values in both MS-DOS file header and in PE headers are stored
using little-endian convention. This means that a four byte integer
e.g. `0x11223344` will be represented on disk by bytes `0x44 0x33 0x22 0x11`
(least significant byte first).
Of course this applies only to multi-byte types supported by CPU
(`short`, `int`, `long`, `double` and `float`).
Also because characters in ASCII strings are represented by single bytes
they are not affected by endianness.
For example string "foo" is represented on disk as `0x66 (f) 0x6f (o) 0x6f (o)`
in both little-endian and bit-endian conventions.

I must admit that most of values in MS-DOS header seem magical to me.
The most important thing that I learn by looking at the header was its size:
64 bytes. So after first 64 bytes of MS-DOS Stub
I expect to find some MS-DOS code.
{% highlight no-highlight %}
$ dd if=dotnet-msdos-stub.exe \
    of=code.com bs=1 skip=64 count=64

$ file code.com 
code.com: COM executable for DOS
{% endhighlight %}

Before we attempt to disassemble code we must learn how MS-DOS
programs are loaded in memory. I didn't make a deep research but
I have found a few valuable informations:

* MS-DOS divides memory in 64k segments. Programs refer to
 a specific address in memory using `segment:offset` pair.
 `segment` value is set by MS-DOS when program is loaded and
 is stored in special CPU registers like `CS` (code segment)
 or `SS` (stack segment).
* `e_ip` value of MS-DOS header points to the first instruction
 of the program (to be more precise `e_ip` is `offset` inside `e_cs`
 code segment).

Let's try to use [NASM](http://www.nasm.us/) to disassemble our code:
{% highlight no-highlight %}
$ ndisasm -b 16 code.com 
00000000  0E                push cs
00000001  1F                pop ds
00000002  BA0E00            mov dx,0xe
00000005  B409              mov ah,0x9
00000007  CD21              int 0x21
00000009  B8014C            mov ax,0x4c01
0000000C  CD21              int 0x21
0000000E  54                push sp
0000000F  686973            push word 0x7369
00000012  207072            and [bx+si+0x72],dh
00000015  6F                outsw
00000016  677261            jc 0x7a
00000019  6D                insw
0000001A  206361            and [bp+di+0x61],ah
...
{% endhighlight %}
While reading resulting assembly code we must remember that our tiny program
stores both "This program cannot be run in DOS mode" 
message data and code in the same segment.
Since the message starts at offset `0x0E` we may assume that `int 0x21`
is the last instruction of the program.
![Offset of the message](assets/images/2017-11-18/hex2.png)

Now we should try to analyze this assembly code, fortunately for me
I have found this beautifully commend piece of code 
[here](https://en.wikibooks.org/wiki/X86_Disassembly/Windows_Executable_Files#MS-DOS_header):
{% highlight shell %}

push cs ;# Push CS onto the stack
pop ds  ;# Set DS to CS

; # (me) This means that Data Segment
; # and Code Segment point to the same
; # 64k byte area of memory.
; # Without this we would not be able
; # to load any data.

mov dx, message ;# dx will contain pointer to message
mov ah, 09  
int 0x21 ;# when AH = 9, DOS interrupt to write a string

;# terminate the program
mov ax,0x4c01 
int 0x21

message db "This program cannot be run in DOS mode.", 
    0x0d, 0x0d, 0x0a, '$'
{% endhighlight %}

Since we go that far why don't we change default stub to something more
interesting e.g. printing "Nyan" 3 times?
First we must create a valid assembly program:
{% highlight shell %}
ORG 0h ;# Offset 0, for NASM

push cs 
pop ds 

; # print message 3 times
mov bx, 3
push bx
repeat:
        mov dx, message 
        mov ah, 09  
        int 0x21

        pop bx
        dec bx
        push bx
cmp bx, 0
jg repeat
pop bx

; # terminate the program
mov ax,0x4c01 
int 0x21

; ----------  D A T A  -------------

message: DB "Nyaan.", 0x0d, 0x0d, 0x0a, '$'
{% endhighlight %}
The main idea here is that we keep loop counter on the top of the
stack and we load counter into `bx` register only to decrement it
or to compere it with zero. I keep the counter value on the stack because
I don't know if contents of `bx` register is changed by `int 0x21`
interrupt (yeah I am too lazy too check).

If you have some spare time you may play with other MS-DOS and BIOS
interrupts to print colorful messages or to beep at the user.

Let's compile our assembly code and patch one of our `.exe` files:
{% highlight no-highlight %}
# -fbin - just translate instruction to bytes
$ nasm -fbin code_alt.nasm -o code_alt.com

# check file size...
$ stat code_alt.com
  File: 'code_alt.com'
  Size: 37  (...)

# patch EXE file
$ dd conv=notrunc if=code_alt.com \
    of=nativeexe/main64.exe \
    bs=1 seek=64 count=37

# Check it works on "Windows"
$ wine ./nativeexe/main64.exe 
Hello, world!
# Yay! Still working!
{% endhighlight %}
And when we start it using DOSBox:
![DOSBox main window](assets/images/2017-11-18/dosbox4.png)

![The End](assets/images/memes/mission_accomplished.jpg)

