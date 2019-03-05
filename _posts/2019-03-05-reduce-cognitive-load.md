---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Reduce cognitive load for readers of your code
date: 2019-03-05 00:00:00
tags: dotnet
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I was reviewing a piece of code that was performing
some computation on file sizes. The author of that code
followed good programming practices and created a separate
type for representing file sizes:
{% highlight csharp %}
public struct FileSize {
   public static FileSize FromBytes(ulong bytes)
       => new FileSize(bytes);
   // Other factory methods...
   
   private ulong _bytes;
   public ulong TotalBytes
       => _bytes;
   
   public FileSize(ulong bytes) {
       _bytes = bytes;
   }
   // Other stuff, equatable, comparable, blah...
   
   public override string ToString()
       => $"{_bytes:##,#B}";
   
   public static FileSize operator+(FileSize left, FileSize right)
       => new FileSize(left._bytes + right._bytes);
   // Other operators...
}
{% endhighlight %}
Yet when it came to computing a total size of set of files I saw
code like this:
{% highlight csharp %}
var total = fileSizes.Aggregate((acc, curr) => acc + curr);
{% endhighlight %}
What is wrong with this code?
It forces readers to concentrate on irrelevant details like how
to sum a list of file sizes. As a programmer, reading a lot
of code I would prefer to have something like:
{% highlight csharp %}
var total = fileSizes.Sum();
{% endhighlight %}
Which is shorter, easier to read and also hides implementation
of `Sum` method. 

The first code snippet is also a good example of 
[Mixing levels of abstractions](http://wiki.c2.com/?MixingLevels)
antipattern. If you never heard about this antipattern or
of the _Single level of abstraction_ principle you can find
[a good introduction here](http://principles-wiki.net/principles:single_level_of_abstraction).

Fortunately for us, we may quickly implement `Sum` 
using extension methods and also solve the problem
of summing empty list of file sizes (which previous snippet did not
handle well):
{% highlight csharp %}
public static class EnumerableOfFileSize {
     /* This version is fine, but does not check overflow:
     public static FileSize Sum(this IEnumerable<FileSize> sizes)
         => sizes.Aggregate(FileSize.FromBytes(0), 
                            (acc, curr) => acc + curr);
     */

     public static FileSize Sum(this IEnumerable<FileSize> sizes) {
         ulong total = 0;

         foreach (var size in sizes) {
             total = checked(total + size.TotalBytes);
         }

         return new FileSize(total);
     }
 }
{% endhighlight %}

After this change we achieved code that is easy to read and
also hides irrelevant details. Yay!

