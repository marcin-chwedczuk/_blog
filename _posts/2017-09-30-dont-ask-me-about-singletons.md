---
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Don't ask me about Singletons
date: 2017-09-30 00:00:00
tags: csharp
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Some time ago I attended a job interview for C# developer position in Warsaw.
One of the tasks that I had to perform was to implement a singleton pattern
in C#. With a bit of help from my interviewer
(I didn't get a cup of coffee that morning) I arrived at a solution:
{% highlight csharp %}
public class Singleton {
    private static Singleton _instance = null;
    private static object _lock = new object();
    
    public static Singleton Instance {
        get {
            if (_instance == null) {
                lock(_lock) {
                    if (_instance == null) {
                        _instance = new Singleton();    
                    }
                }
            }
            return _instance;
        }
    }
    
    private Singleton() {
        Console.WriteLine("Singleton()");   
    }
    public void DoJob() {
        Console.WriteLine("Singleton::DoJob()");
    }
}
{% endhighlight %}
We both admitted that this was a good enough solution 
and we moved to other questions.

Later the same day I had some spare time
at launch break so I started to think about my solution again.
Is it really the best way to create singletons in C#, I asked myself.
As it happens answer to my question was contained on
"C# in Depth" book 
[accompanying website](http://csharpindepth.com/Articles/General/Singleton.aspx#dcl).
There Jon Skeet commented on above solution:

>Without any memory barriers, it's broken in the ECMA CLI specification too. It's possible that under the .NET 2.0 memory model (which is stronger than the ECMA spec) it's safe, but I'd rather not rely on those stronger semantics, especially if there's any doubt as to the safety. Making the instance variable volatile can make it work, as would explicit memory barrier calls, although in the latter case even experts can't agree exactly which barriers are required. I tend to try to avoid situations where experts don't agree what's right and what's wrong!
>
> -- Jon Skeet

In practice this means that it is not strictly required by .NET specification
that this implementation should work. Currently it works on .NET standard,
and I guess Microsoft folks will also make sure that it 
works on .NET Core - but we cannot be 100% sure.

In the same article Jon Skeet proposes a better pattern:
{% highlight csharp %}
public sealed class Singleton
{
    public static Singleton Instance { 
        get { return Nested.instance; } }
        
    private class Nested
    {
        // Explicit static constructor to tell C# compiler
        // not to mark type as beforefieldinit
        static Nested() { }

        internal static readonly SingletonC instance 
            = new Singleton();
    }

    private Singleton()
    {
        Console.WriteLine("Singleton()");
    }
}
{% endhighlight %}
This works because if a type provides a static constructor, C# will
run static initializers lazily (on a first call to any method, including
constructors or access to any field). Without static constructor
runtime may invoke static initializers at any point in time prior to
the first access to any type member. In practice it means that our
singleton without empty static constructor in `Nested` class is no longer lazy.

So it looks like the cure is worse than the disease. Now we require that
any person that implements singletons in our codebase knows about
`beforefieldinit` attribute, which 
unfortunately is clearly visible only in CIL bytecode and is responsible
for the above behaviour:
{% highlight csharp %}
// without static constructor Nested class is declared in CIL
// as follows:
.class nested private auto ansi beforefieldinit Nested
        extends [mscorlib]System.Object
    { ... }

// and with static constructor we get:
.class nested private auto ansi Nested
        extends [mscorlib]System.Object
    { ... }
{% endhighlight %}

Also our version 2.0 doesn't protect us 
from forming cyclic dependency between singletons:
{% highlight csharp %}
public sealed class SingletonC
{
    // singleton stuff...

    private SingletonC()
    {
        Console.WriteLine("SingletonC()");
        Console.WriteLine("D: " + SingletonD.Instance);
    }
}

public sealed class SingletonD
{
    // singleton stuff...

    private SingletonD()
    {
        Console.WriteLine("SingletonD()");
        Console.WriteLine("C: " + SingletonC.Instance);
    }
}

public static void Main()
{
    Console.WriteLine("Main()");
    var tmp = SingletonC.Instance;
}
// Program output:
// Main()
// SingletonC()
// SingletonD()
// C: (null)
// D: SingletonD
{% endhighlight %}
As we can see `SingletonC.Intance` inside `SingletonD` constructor
returned `null`. If we tried to create cyclic dependency with our
first solution we would get a `StackOverflowException`. So at least
we would know that something is wrong.
Anyway looks like creating a singleton requires some skills...

And since we are talking about singletons already, its also worth to
know that .NET allows us to create an instance of type without invoking
constructor (useful when implementing e.g. JSON serialization library).
Objects created this way will be of course incomplete but still:
{% highlight csharp %}
FormatterServices.GetUninitializedObject(typeof(SingletonC));
{% endhighlight %}
And of course we don't even talk about reflection API that we may use to
destroy even most foolproof singletons.

So I guess now its a summary time! If you want to use singletons in
your code that badly, please read carefully Jon Skeet articles
from reference section. For the rest of us: let's forget about 
handcrafted singletons
and start using Dependency Injection!

PS. Also be careful when asking questions about Singletons 
at job interviews unless
you want to hear discussion about `beforefieldinit` ;)

References:

* [http://csharpindepth.com/Articles/General/Singleton.aspx](http://csharpindepth.com/Articles/General/Singleton.aspx)
* [http://csharpindepth.com/Articles/General/Beforefieldinit.aspx](http://csharpindepth.com/Articles/General/Beforefieldinit.aspx)


