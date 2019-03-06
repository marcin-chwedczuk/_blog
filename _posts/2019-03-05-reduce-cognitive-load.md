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
       => new FileSize(checked(left._bytes + right._bytes));
   // Other operators...
}
{% endhighlight %}
Yet when it came to computing a total size of set of files I saw
code like this:
{% highlight csharp %}
var totalSize = fileSizes.Aggregate((acc, curr) => acc + curr);
{% endhighlight %}
What is wrong with this code?
It forces readers to concentrate on irrelevant details like how
to sum a list of `FileSize`s. As a programmer, reading a lot
of code I would prefer to see something like:
{% highlight csharp %}
var totalSize = fileSizes.Sum();
{% endhighlight %}
Which is shorter, easier to read and allows me to concentrate
on the actual business problem that I try to solve.

As an another example, imagine what would happen if people
started writing:
{% highlight csharp %}
var listOfNumbers = Enumerable.Range(0, 10)
	.Aggregate(new List<int>(), (list, el) => {
		list.Add(el);
		return list;
	});
{% endhighlight %}
instead of:
{% highlight csharp %}
var listOfNumbers = Enumerable.Range(0, 10)
	.ToList();
{% endhighlight %}
I hope that you agree with me that it would not be nice...

The general rule that is violated by both these examples
is called _Single level of abstraction principle_, you can read
more about it 
[here](http://principles-wiki.net/principles:single_level_of_abstraction).
In short it states that, all statements of a method should belong
to the same level of abstraction.
In other words we should not mix low and high level operations
in a single method. In our example `Aggregate` and details how
to use it are low level, computing a total size of set of files is
on the other hand a high level one.

Fortunately for us, we may quickly add appropriate `Sum` method
to our program:
{% highlight csharp %}
public static class EnumerableOfFileSize {
    public static FileSize Sum(this IEnumerable<FileSize> sizes)
      => sizes.Aggregate(FileSize.FromBytes(0), 
                         (total, curr) => total + curr);

    /* Or in more imperative style:
    public static FileSize Sum(this IEnumerable<FileSize> sizes) {
        ulong total = 0;

        foreach (var size in sizes) {
            total = checked(total + size.TotalBytes);
        }

        return new FileSize(total);
    }
    */
}
{% endhighlight %}

After this change we achieved code that is easy to read and
also hides irrelevant details. Yay!

