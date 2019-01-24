---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: ReadOnly does not mean Immutable
date: 2019-01-06 00:00:00
tags: dotnet, architecture
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I have introduced a subtle bug into my code.
It all started when I was creating a few
value object classes:
{% highlight csharp %}
public class Method {
    public string Name { get; }
    public Method(string name) {
        Name = name;
    }
    // Equals, GetHashCode, ToString skipped
    // to save space.
}
public class TypedArgument {
    public Type Type { get; }
    public object Value { get; }
    public TypedArgument(Type type, object value) {
        Type = type;
        Value = value;
    }
}
public class MethodCall {
    public Method CalledMethod { get; }
    public IReadOnlyList<TypedArgument> PassedArguments { get; }
    public MethodCall(
        Method calledMethod,
        IReadOnlyList<TypedArgument> args)
    {
        CalledMethod = calledMethod;
        // NOTICE: No defensive copy.
        PassedArguments = args;
    }
}
{% endhighlight %}
While implementing `MethodCall` class constructor, I wrongly assumed
that `IReadOnlyList<T>` behaves like an immutable list.
In other words that its content never changes.
Due to this wrong assumption I did not create a defensive copy,
that I usually do for collection arguments.
Instead I just assigned `args` parameter to
a readonly property named `PassedArguments`.

`MethodCall` object was then used by another component
called `MethodCallSpy`:
{% highlight csharp %}
public class MethodCallSpy {
    private readonly List<MethodCall> _methodCalls
        = new List<MethodCall>();

    public IReadOnlyList<MethodCall> MethodCalls
        => _methodCalls;

    private List<TypedArgument> _currentArguments
        = new List<TypedArgument>();

    public void AddArgument(TypedArgument arg) {
        _currentArguments.Add(arg);
    }

    public void AddMethodCall(Method method) {
        var methodCall = 
            new MethodCall(method, _currentArguments);
        _methodCalls.Add(methodCall);

        // NOTICE: Old List<T> is not modified.
        _currentArguments = new List<TypedArgument>();
    }
}
{% endhighlight %}
`MethodCallSpy`
gathers `TypedArgument`s passed to it via `AddArgument` calls
in `_currentArguments` list. 
Then when someone calls `AddMethodCall` method, it uses stored
`TypedArgument`s and a value of `method` parameter to construct
a new `MethodCall` object and adds it to `_methodCalls` list.

`MethodCallSpy` class worked perfectly, at least until I
returned to it a few days later to make some improvements.
Yes, I know, I know
["premature optimization is the root of all evil"](https://xkcd.com/1691/)
but this was my quick'n'dirty pet project and I just cannot resist:
{% highlight csharp %}
// readonly added.
private readonly List<TypedArgument> _currentArguments
    = new List<TypedArgument>();
public void AddMethodCall_AfterRefactoring(Method method) {
    // Assumes that MethodCall will make a defensive copy
    // of _currentArguments list.
    var methodCall = 
        new MethodCall(method, _currentArguments);

    _methodCalls.Add(methodCall);

    // NOTICE: We use clear instead of creating a new list
    _currentArguments.Clear();
}
{% endhighlight %}
Of course I also made a lot of other refactorings without
running my tests (I had only a few integration tests).
This was another mistake of mine. Looks like good
programming practices help even if you are building
quickly a Proof Of Concept solution.

When I finally ran my tests, they all have failed. For some reason
`MethodCall` objects did not contain any `TypedArgument`s.
Strange, isn't it...

After a quarter of debugging, I have found that the bug was
introduced by my wrong assumptions about `IReadOnlyList<T>`
interface.

`IReadOnlyList<T>`, `IReadOnlyCollection<T>` interfaces and
`ReadOnlyCollection<T>` class where introduced
to protect owners of the collections, not the receivers.
For example if a method is declared like this:
{% highlight csharp %}
void ProcessList<T>(IReadOnlyList<T> list);
{% endhighlight %}
We can be sure, that it will not attempt to modify
the list that we are going to pass to it:
{% highlight csharp %}
var list = new List<string> { "foo", "bar" };
ProcessList(list);
// still: list == new List<string> { "foo", "bar" }
{% endhighlight %}
Of course `ProcessList` method may be
implemented in an evil way:
{% highlight csharp %}
private void ProcessList<T>(IReadOnlyList<T> list) {
    (list as IList<T>)[0] = default(T);
}
{% endhighlight %}
But we can protect our lists from evil code by using `AsReadOnly`
method, that returns a `List<T>` instance
wrapped in a `ReadOnlyCollection<T>` object
([source code](https://github.com/dotnet/corefx/blob/master/src/Common/src/CoreLib/System/Collections/Generic/List.cs#L251)).
{% highlight csharp %}
var list = new List<string> { "foo", "bar" };
ProcessList(list.AsReadOnly());
// Our list can be modified now
// only by using reflection
// to get access to private fields
// of ReadOnlyCollection<T> class.
{% endhighlight %}

On the other hand receivers of `IReadOnlyList<T>` arguments
are not protected at all. Consider this short program:
{% highlight csharp %}
[Fact]
public void ReadonlyButNotForYou() {
    var list = new List<int> { 1, 2, 3 };

    int extraInt() {
        list[0] = 42;
        return list[0];
    }

    ProcessList(list, extraInt);
}
private void ProcessList(IReadOnlyList<int> ints, Func<int> extraInt) {
    int first = ints.First();
    int tmp = extraInt();
    int firstAgain = ints.First();

    Assert.Equal(first, firstAgain); // fails
}
{% endhighlight %}
It demonstrates that `IReadOnlyList<T>` can change even
during duration of a single method!

So what should we do to avoid this class of bugs?
Option one is to use old and proven defensive copy
technique:
{% highlight csharp %}
public MethodCall(
    Method calledMethod, 
    IReadOnlyList<TypedArgument> args)
{
    CalledMethod = calledMethod;
    PassedArguments = 
        new List<TypedArgument>(args);
}
{% endhighlight %}
Remember not to use `ReadOnlyCollection<T>` class to create
a defensive copy. This class is only a wrapper - it
does not copy the actual data.

The second option is to use truly immutable
data structures, for example from
[System.Collections.Immutable](https://www.nuget.org/packages/System.Collections.Immutable)
package:
{% highlight csharp %}
public MethodCall(
    Method calledMethod, 
    IImmutableList<TypedArgument> args)
{
    CalledMethod = calledMethod;
    PassedArguments = args;
}
{% endhighlight %}
These types are truly immutable, they never change their
contents after they are created.

One problem that I have with `System.Collections.Immutable`
is that immutable types have often different performance
characteristics than their mutable counterparts.
For example `ImmutableList` is implemented using,
guess what, a good old AVL tree
([source code](https://github.com/dotnet/corefx/blob/master/src/System.Collections.Immutable/src/System/Collections/Immutable/ImmutableList_1.cs#L28)).

On the other hand `ImmutableArray` that is backed by a
regular array, seems like a perfect candidate for making
defensive copies. You can read more about `ImmutableArray`
in [this MSDN article](https://blogs.msdn.microsoft.com/dotnet/2013/06/24/please-welcome-immutablearrayt/).

It is never wrong to take a look at the collection source code
before using it (all links to GitHub):

* [ReadOnlyCollection](https://github.com/dotnet/corefx/blob/master/src/Common/src/CoreLib/System/Collections/ObjectModel/ReadOnlyCollection.cs)
* [ImmutableList](https://github.com/dotnet/corefx/blob/master/src/System.Collections.Immutable/src/System/Collections/Immutable/ImmutableList_1.cs)
* [ImmutableArray](https://github.com/dotnet/corefx/blob/master/src/System.Collections.Immutable/src/System/Collections/Immutable/ImmutableArray_1.cs)

