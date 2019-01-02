---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Random thoughts on Maybe
date: 2019-01-01 00:00:00
tags: dotnet architecture
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

With functional programming on the rise nowadays, 
more and more people start using functional 
patterns in thier code.
One of the simplest patterns is `Maybe<T>` monad
(also called `Option<T>` or `Optional<T>`).
`Maybe<T>`'s primary usecase is to represent a possibly
missing value. 

I have already use `Maybe<T>` a few times in real
codebases and in this post I want to gather my thoughts
on `Maybe<T>` and how, I think, it should be used.

#### Why we use `Maybe<T>`?

Most people that use `Maybe<T>` generally fall into
one of the two categories.

##### Category 1: Wants to eliminate `NullReferenceException`

For a long time before `Maybe<T>` programmers tried to
cleary state to the clients of their API that a given
method may return `null` instead of an object.
Some of them used special method naming conventions or 
comments. 
For example:
{% highlight csharp %}
TODO: Add xml doc comments
// Method name convention in action.
// Alternative would be to use XML documentation comments.
public interface IUserRepository {
    // This method can return null.
    User FindById(UserId id);

    // Notice 'Required' word in metod name.
    // Throws exception when user is not found.
    User FindRequiredById(UserId id);
}
{% endhighlight %}
Others resorted to using special marking attributes and
static code analysis tools. 
A good example of this category is 
[JetBrains.Annotations](https://www.nuget.org/packages/JetBrains.Annotations) package, that can be used with ReSharper
to detect missing null checks:
{% highlight csharp %}
public interface IUserRepository {
    [CanBeNull]
    User FindById(UserId id);
}

public interface IUserService {
    void ActivateUser([NotNull]User user);
}
{% endhighlight %}
Yet another solution to this problem were 
[Code Contracts](https://www.infoq.com/articles/code-contracts-csharp)
developed by Microsoft.

None of the solutions is pefect and `Maybe<T>` seems
to offer a better alternative. 
Why? Because it is checked by the compiler,
does not require additional tools and does not slow
down compilation.
But remember there is 
[no silver bullet](https://en.wikipedia.org/wiki/No_Silver_Bullet),
and `Maybe<T>` is not perfect either.
Here is how we would use `Maybe<T>` with our example:
{% highlight csharp %}
public interface IUserRepository {
    Maybe<User> FindById(UserId id);
}
// and usage:
var user = usersRepository.FindById(userId);
if (user.HasValue) {
    return Ok(user);
}
else {
    return NotFound();
}
{% endhighlight %}
If you find yourself in this category of programmers, 
you would definitely
want to use a lightweight library that
does not force you to embrace a more functional style.
One good library that I can recomment is: 
[CSharpFunctionalExtensions](https://github.com/vkhorikov/CSharpFunctionalExtensions)

If you choose a different library, please make sure to check
that `Maybe<T>` is implemented using `struct`, otherwise you
may be suprised:
{% highlight csharp %}
Maybe<string> GetUserAgent() {
    return null;
}
{% endhighlight %}
One small downside of using a `struct` is
possibility of declaration of a nullable `Maybe<T>` type:
{% highlight csharp %}
// Don't do this:
Maybe<string>? bad;
{% endhighlight %}

When I was writing this article I tried to gather some
best practices of using `Maybe<T>`. 
Unfotunatelly it was very difficult to provide a comprehensive
list. There is not much material on this on the web (I mean using 
`Maybe<T>` *not* in the FP fashion) and the available
material is often contradictory. 
And so instead of providing you with a list of best practices, 
I will only give you some hints where you can look for advice.

We should start our search by looking at
Java 8, which was published in 2014 and introduced 
`java.util.Optional<T>` class. 
The purpose of this class is to be a nullability marker
for method results just like our `Maybe<T>`. 
There are a lot of articles about how `Optional<T>` should
and should not be used. 
A good starting point will be 
[this SO question](https://stackoverflow.com/questions/26327957/should-java-8-getters-return-optional-type)
with the first two answers. 
From this question alone we may lern e.g. to never wrap
a collection into `Maybe<T>`, 
instead of we should return a possibly empty collection.

The downside of reading Java's best practices is that some
of them do not apply to C#. For example let's look at the
advice given in [this SO answer](https://stackoverflow.com/a/39005452/1779504):

> When a method can accept optional parameters, 
> it's preferable to adopt the well-proven approach 
> and design such case using method overloading.

In other words author suggest to change:
{% highlight csharp %}
// this ctor:
public SystemMessage(
    string title,
    string body,
    Maybe<Attachment> attachment);

// into two ctor's:
public SystemMessage(
    string title,
    string body,
    Attachment attachment);

public SystemMessage(
    string title,
    string body);

// Because using these ctor's would be easier for
// the clients. Consider:
new SystemMessage("foo", "bar", Maybe<Attachment>.None)
new SystemMessage("foo", "bar", 
    Maybe<Attachment>.From(attachment))
// vs
new SystemMessage("foo", "bar");
new SystemMessage("foo", "bar", attachment);
{% endhighlight %}
But this argument does not applies to C#, where we can
use implicit conversion operator with default parameters
to achieve exactly the same effect without using overloads:
{% highlight csharp %}
public struct Maybe<T> { 
    private T _value;
    private bool _present;
    
    public Maybe(T value) { 
        _value = value;
        _present = (value != null);
    }
    
    public static implicit operator Maybe<T>(T value)
        => value == null ? new Maybe<T>() : new Maybe<T>(value); 
}

public class Attachment { }

public class SystemMessage {
    public SystemMessage(
        string title, string body, 
        Maybe<Attachment> attachment = default(Maybe<Attachment>)) { 
    }
}   

public class Program
{
    public static void Main() { 
        new SystemMessage("foo", "bar");
        new SystemMessage("foo", "bar", new Attachment());
    }
}
{% endhighlight %}
As we can see every Java'ish advice must be taken with 
a grain of salt.

Fortunatelly for us there is more and more C# posts about
using `Maybe<T>`. For example [this one](https://enterprisecraftsmanship.com/2015/03/13/functional-c-non-nullable-reference-types/)
from the author of CSharpFunctionalExtensions library.

Although I cannot provide you with a list of best practies,
I think I have gathered enought experience to provide
you with a list of `Maybe<T>` code smells:

* Nested `Maybe`s are wrong, for example `Maybe<Maybe<string>>`.
 Usually this is a sign that you should replace one of
 `Map` calls by a `FlatMap` (alternatively a `Select` by a `SelectMany` call).
* `Maybe`s wrapping collections are wrong, for example `Maybe<List<User>>`.
 Instead return a non-empty or empty collection.
* `Maybe`s wrapping nullable types are wrong, for example `Maybe<int?>`.
 Instead convert nullable type `T?` to `Maybe<T>`. 
 Even if you chosen library does not support such conversion out of 
 the box, you may write an extension method that provides this functionality
 yourself:

{% highlight csharp %}
public static Maybe<T> ToMaybe<T>(this T? value)
        where T: struct
    => value.HasValue ? Maybe<T>.From(value.Value) : Maybe<T>.None;
{% endhighlight %}

* Nested callbacks when using `Maybe<T>` fluent interface are wrong.
 For example:

{% highlight csharp %}
// BAD Fluent interface spaghetti
var cultureBad = user.Select(
    u => LoadPreferences(u)
        .Select(prefs => prefs.Culture));

// GOOD, only one operation per Select method call
var cultureGood = user
    .Select(u => LoadPreferences(u))
    .Select(prefs => prefs.Culture);
{% endhighlight %}

Also be mindful when using `Maybe<T>` with properties.
A declaration like:
{% highlight csharp %}
public Maybe<string> Culture { get; set; }
{% endhighlight %}
Means that you may both get and set an optional value.
In other words assignment of `None` value to this 
property should be valid:
{% highlight csharp %}
foo.Culture = Maybe<string>.None;
{% endhighlight %}
A property that can return `None` but must be
set to some value should be split into a getter and a method:
{% highlight csharp %}
// AVOID:
Maybe<string> Culture {
    get { return Maybe<string>.From(_culture); }
    set {
        if (value.HasNoValue)
            throw new ArgumentException("Culture cannot be empty.");
        _culture = value.Value;
    }
}

// PREFER:
Maybe<string> Culture
    => Maybe<string>.From(_culture);

void SetCulture(string culture) {
    if (culture == null)
        throw new ArgumentException("Culture cannot be empty.");
    _culture = culture;
}
{% endhighlight %}

As you probably heard C# 8.0 is going to introduce a nullable reference types (NRT).
Will NRT replace `Maybe<T>`?
For "Category 1" programmers, NRTs offer a better
alternative to `Maybe<T>`. On the other hand a lot of people
that start in "Category 1", slowy begin to embrace more FP apporach.
Usually people start by using `Maybe<T>` fluent interface to transform
one `Maybe<T>` value into another. After some time they take a leap and
switch to writing in a more functional fashion.

We may also take a look at [Kotlin](https://kotlinlang.org/),
a language created by JetBrains that from the very beginning 
[offered nullable reference types](https://kotlinlang.org/docs/reference/null-safety.html). 
And yet the most popular Kotlin functional library
[funKTionale](https://github.com/MarioAriasC/funKTionale) 
still offers an `Option` type. 
So it looks like NRT or not, `Maybe<T>` is going to stay with us for sure.

##### Category 2: Wants to embrace FP paradigm

Programmers belonging to this category embraced FP. They
often think about using F# at work and are a bit dissapointed
by poor C# pattern matching facilities. 

Code written in FP fashion will never use `if` to check
if `Maybe<T>` contains some value, instead a fluent interface
will be used to transform `Maybe<T>`s into some other values, for example:
{% highlight csharp %}
private UserRepository _userRepository;

// NOTICE: No if's in code
public static Option<string> GetUserCulture(int userId)
    => _userRepository.FindById(userId)
        .BiMap(
            Some: user => GetUserCulture(user),
            None: _ => null);

public static string GetUserCulture(User user)
    => user.Preferences    
            .Map(prefs => prefs.Culture)
            .IfNone("en-US");

public class UserRepository {
    private readonly List<User> _users = new List<User> {
        new User(1, null),
        new User(2, new UserPreferences {
            Culture = "pl-PL"
        })
    };

    // NOTICE: Extra extension methods for IEnumerable<T>
    // that return Option<T> instead of null's.
    public Option<User> FindById(int userId) {
        return _users.Find(u => u.UserId == userId);
    }
}

public class User {
    public int UserId { get; }

    private UserPreferences _preferences;
    public Option<UserPreferences> Preferences
        => Optional(_preferences);

    public User(int userId, UserPreferences preferences) {
        UserId = userId;
        _preferences = preferences;
    }
}

public class UserPreferences {
    public string Culture { get; set; }
}
{% endhighlight %}

Alternatively we may change our previous method to:
{% highlight csharp %}
public static string GetUserCulture2(int userId)
    => _userRepository.FindById(userId)
        .Bind(user => user.Preferences) // FlatMap
        .Map(prefs => prefs.Culture)
        .IfNone("en-US"); // default culture
{% endhighlight %}
The only difference between these two methods
is the value returned for users not present in the repository.
`GetUserCulture` returns for them `None()` but `GetUserCulture2`
returns a default culture (`Some("en-US")`).

Another sign of a functional design, is that monads like `Maybe<T>`
will be unpacked only on the outskirts of the application.
For example in a typical RESTful service, `Maybe<T>` value will 
be unpacked only in the controller:
{% highlight csharp %}
// GET /user/{userId}/culture
public IActionResult Get(int userId) {
    // WARNING: In real apps do not return bare strings 
    // from the REST api. 
    // Always wrap them in DTO's / ViewModel's.
    Maybe<string> culture = GetUserCulture();
    return Maybe(culture);
}

// Presumably in the base controller
public IActionResult Maybe<T>(Maybe<T> m)
    => m.Map(value => Ok(value))
        .IfNone(() => NotFound());
{% endhighlight %} 

In this category of programmers there is also a small group
of zealtos, that in my opinion go to far in their cult of monads. 
They propose to use LINQ query syntax to transform monads.
Let my explain this using an example:
{% highlight csharp %}
// We want to sum three Option<int> values.

private static Option<int> GetOptionalInt()
    => 3;

// Using fluent interface:
var sum = GetOptionalInt()
    .SelectMany(_ => GetOptionalInt(), (a,b) => a+b)
    .SelectMany(_ => GetOptionalInt(), (a,b) => a+b);

// Using LINQ query:
var sum2 =  from n1 in GetOptionalInt()
            from n2 in GetOptionalInt()
            from n3 in GetOptionalInt()
            select n1+n2+n3;
{% endhighlight %}
I must admin that LINQ query offers some advantages like
ability to use `let` and `where` keywords. Also some transformations
may be easier to express using LINQ query syntax, for example:
{% highlight csharp %}
var sum2 =  
    from n1 in GetOptionalInt()
    from n2 in GetOptionalInt()
    from n3 in GetOptionalInt()
    let max = Math.Max(n1, Math.Max(n2, n3))
    let min = Math.Min(n1, Math.Min(n2, n3))
    where min != 0
    select max / min;
{% endhighlight %} 
Yet in my opinion fluent interface is a much more readable
and easy to understand way to transform `Maybe<T>`s and other monads.
For example we may rewrite last code snippet to:
{% highlight csharp %}

{% endhighlight %}
