---
layout: post
cover: 'assets/images/cover7.jpg'
title: Reading and writing files in Java
date:   2016-06-13 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
---

#### Binary vs Text Files
Java IO supports two distinct kinds of files: text files and binary files.
To understand difference between these two let's look at an example. Say
we have text file encoded using UTF-8 that contains text: "Привет мир!" ("Hello
world!" in Russian), 
when written to disk this file consists of
bytes:
<pre>
$ xxd -g1 hello_ru.txt 
0000000: d0 9f d1 80 d0 b8 d0 b2 d0 b5 d1 82 20 d0 bc d0  ............ ...
0000010: b8 d1 80 21 0a                                   ...!.
</pre>
Let's say that we want to print contents of this file to standard output, we can read
*bytes* contained in the file using the following code:
{% highlight java %}
public static void main(String[] args) throws Exception {
    FileInputStream input = null;
    
    try {
        input = new FileInputStream("hello_ru.txt");
        
        int b;
        while ((b = input.read()) != -1) {
            System.out.printf("%02x ", b);
        }
    }
    finally {
        if (input != null)
            input.close();
    }
}
{% endhighlight %}
When ran this program prints:
{% highlight no-highlight %}
d0 9f d1 80 d0 b8 d0 b2 d0 b5 d1 82 20 d0 bc d0 b8 d1 80 21 0a
{% endhighlight %}
Pretty much the same output as returned by `xxd`. This is because `FileInputStream` is
a byte stream - a stream that treads file contents as array of bytes. When we call `input.read()` we
told stream to read next single *byte* from file. But wait our file contains text in Russian not
some bytes. To read text we must use another kind of stream called character stream, here is next
program that correctly prints "Привет мир!" to standard output:
{% highlight java %}
public static void main(String[] args) throws Exception {
    InputStreamReader characterStream = null;
        
    try {
        FileInputStream byteStream = 
            new FileInputStream("hello_ru.txt");
                
        characterStream = new InputStreamReader(byteStream, "UTF8");
        
        int c;
        while ((c = characterStream.read()) != -1) {
            System.out.print((char)c);
        }
    }
    finally {
        if (characterStream != null)
            characterStream.close();
    }
}
{% endhighlight %}
This time we are using `InputStreamReader` to read file contents. 
When we call `characterStream.read()`
we get next *character* from file (which may consists of one or more bytes). 
Notice that `InputStreamReader` to work must known encoding used to
create file, in our case we pass `"UTF8"` encoding as a 
parameter to `InputStreamReader` constructor.

To sum up table below presents classes used to read and write text and binary files in Java:

| Stream     | Read                 | Write                  |
|------------|----------------------|------------------------|
| Byte       | `FileInputStream`    | `FileOutputStream`     |
| Character  | `InputStreamReader`  | `OutputStreamWriter`   |
| Character  | `FileReader`         | `FileWriter`           |

Last two classes `FileReader` and `FileWriter` are equivalent to using `InputStreamReader` and
`OutputStreamWriter` with `Charset.defaultCharset().name()` as encoding.
Default encoding (charset) may differ between various JVM's, it is always better to use
`InputStreamReader` and `OutputStreamWriter` with explicit encoding than to relay on `FileReader`
and `FileWriter` classes.

Finally let's see class diagrams that connects classes described above with abstract classes
like `Reader` and `Writer`:
![Java IO classes hierarchy](assets/images/2016-06-13/fileio_class_diag.svg)

#### Buffered IO
So far we were using only unbuffered streams, when we call `read()` JVM invoked some OS functions that
actually read byte(s) from file. Since calling OS functions is slow this approach is inefficient. 
We could do better if we read bytes in big
chunks say by 8KB and then store them in some internal array and serve next 8192 `read()`'s from
that internal array without any further OS calls.

Fortunately we don't need to write such a *buffered* streams ourselves, Java comes with already
tested and documented implementations. Similar to unbuffered streams there are two flavours
of buffered streams one for text and one for binary files. Let's see an example that
demonstrates how to use buffered streams:
{% highlight java %}
public static void main(String[] args) throws Exception {
    BufferedReader bufferedReader = null;

    try {
        FileInputStream byteStream = 
            new FileInputStream("hello_ru.txt");

        InputStreamReader characterStream = 
                new InputStreamReader(byteStream, "UTF8");
        
        bufferedReader = new BufferedReader(characterStream);
        
        int c;
        while ((c = bufferedReader.read()) != -1) {
            System.out.print((char)c);
        }
    }
    finally {
        if (bufferedReader != null)
            bufferedReader.close();
    }
}
{% endhighlight %}
As you can see all you need to do is to wrap `InputStreamReader` into `BufferedReader` class.

Table below presents buffered streams for each of the unbuffered streams we already know:

| Stream     | Unbuffered           | Buffered               |
|------------|----------------------|------------------------|
| Byte       | `FileInputStream`    | `BufferedInputStream`  |
| Byte       | `FileOutputStream`   | `BufferedOutputStream` |
| Character  | `InputStreamReader`  | `BufferedReader`       |
| Character  | `OutputStreamWriter` | `BufferedWriter`       |

Let's finish by presenting some benchmarks that will show how much we can gain
using buffered streams:

| Test       | Unbuffered           | Buffered               |
|------------|----------------------|------------------------|
| Read 1MB*  |  161 773 ms          | 18 568 ms              |
| Write 1MB* |  236 892 ms          | 22 280 ms              |

*Reading from `/dev/zero` and writing to `/dev/null` on Ubuntu 14 LTS with Oracle Java 8  
As we can see there is almost x10 speed gain, so if you find yourself reading or writing
huge files try to use buffered streams!

#### Line oriented IO
When we work with text files usually we are more interested in reading/writing lines of text
instead of characters.

Let's start with an example that will demonstrate how to read text files line by line:
{% highlight java %}
public static void main(String[] args) throws Exception {
    BufferedReader reader = null;

    try {
        FileInputStream byteStream = 
            new FileInputStream("/proc/meminfo");

        reader = new BufferedReader(
            new InputStreamReader(byteStream, "UTF8"));
        
        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println(line);
        }
    }
    finally {
        if (reader != null)
            reader.close();
    }
}
{% endhighlight %}
`BufferedReader` class contains useful `readLine()` method that allows us to
read entire line from file into `String` object. Unfortunately it doesn't provide
any methods that will allow us to read e.g. numbers from file. If you find yourself
trying to parse lines of text contained in some text file you may want to check
[Scanner class](https://docs.oracle.com/javase/7/docs/api/java/util/Scanner.html).
`Scanner` is a huge class that deserves a blog post on it's own - I will not describe how
to use it here.

When writing content to text files we are in much more better situation thanks to
`PrintWriter` class. `PrintWriter` allows us to write not only lines of text but also
numbers, booleans and even custom formated strings:
{% highlight java %}
public static void main(String[] args) throws Exception {
    PrintWriter writer = null;
        
    try {
        FileOutputStream byteStream = 
                new FileOutputStream("output.txt");
        
        writer = new PrintWriter(
                new OutputStreamWriter(byteStream, "UTF8"));
        
        writer.println(Math.PI);

        writer.print(true); 
        writer.print(' '); 
        writer.println(false);
        
        writer.printf("this is formatted text " + 
                "with number: %d and string: %s%n", 
                42, "foo");
    }
    finally {
        if (writer != null)
            writer.close();
    }
}
{% endhighlight %}
`output.txt` file created by this program looks like this:
{% highlight no-highlight %}
3.141592653589793
true false
this is formatted text with number: 42 and string: foo
{% endhighlight %}
When you're working with `PrintWriter` you definitely want to familiarize yourself with
`printf` method. There is already plenty of blog posts/articles describing how formatting works
e.g. [printf cheatsheet](http://alvinalexander.com/programming/printf-format-cheat-sheet) and
[introduction to printf](http://www.homeandlearn.co.uk/java/java_formatted_strings.html).

#### Closing streams after use
In all presented examples so far we always wrapped code reading or writing to stream
into `try` block and we always closed the stream inside `finally` block. 
Closing streams is very important because program can have only
limited number of open files at any given time. 
For example on my machine Java program can only have 4080 open files,
after than any attempt to open another file throws:
{% highlight no-highlight %}
java.io.FileNotFoundException: filename (Too many open files)
{% endhighlight %}

Generally when dealing with wrapping streams like buffered streams that use 
other streams to read/write data we should close only wrapper. 
This is particularly important
with `BufferedWriter` because closing inner stream may not save data that
were in `BufferedWriter` buffer. Following program illustrates this problem:
{% highlight java %}
public static void main(String[] args) throws Exception {
    OutputStreamWriter output = new OutputStreamWriter(
            new FileOutputStream("test.txt"), "UTF-8");

    BufferedWriter buffered =
            new BufferedWriter(output);

    buffered.write("hello world!");

    output.close();
}
{% endhighlight %}
Running this program will create *empty* `test.txt` file. Changing last line to
`buffered.close()` will fix this issue.

#### Try with resources (Java 7+)

After working with files for a while writing `try ... finally` blocks and
manually closing streams becomes tiring.
Java 7 introduced new statement called try-with-resources that greatly
reduces amount of code needed to properly handle streams.
Let's look at an example:
{% highlight java %}
try(OutputStreamWriter output = new OutputStreamWriter(
        new FileOutputStream("test.txt"), "UTF-8");
    BufferedWriter buffered =
        new BufferedWriter(output)) 
{
    buffered.write("hello world!");
}
{% endhighlight %}
This code will be translated by Java compiler into
(you may use [CFR decompiler](http://www.benf.org/other/cfr/) to get actual code):
{% highlight java %}
OutputStreamWriter output = new OutputStreamWriter(
        new FileOutputStream("test.txt"), "UTF-8");
    
try {
    BufferedWriter buffered = new BufferedWriter(output);
    try {
        buffered.write("hello world!");
    }
    finally {
        if (buffered != null) {
            buffered.close();
        }
    }
}
finally {
    if (output != null) {
        output.close();
    }
}
{% endhighlight %}
As we can see all boring code like `finally` and `if (stream == null)` will be generated
by compiler for us.

NOTE: When we call `buffered.close()` it will write all changes to `output` stream and 
call `output.close()`. Notice that in second `finally` block compiler generated code that
tries to close `output` stream second time. This is perfectly valid, when you call `close()`
on already closed streams this is a [no-op](https://en.wiktionary.org/wiki/no-op).

Try-with-resources can be also used with `catch` clause:
{% highlight java %}
try(OutputStreamWriter output = new OutputStreamWriter(
        new FileOutputStream("test.txt"), "UTF-8");
    BufferedWriter buffered =
        new BufferedWriter(output))
{
    buffered.write("hello world!");
}
catch (IOException ex) {
    ex.printStackTrace();
}
{% endhighlight %}

This will end our tour of classic Java IO. In the next blog post I will present
`Files` and `Path` classes - they are part of Java NIO and can further simplify working
with files.
