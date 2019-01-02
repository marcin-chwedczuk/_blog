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
patterns in their code.
One of the simplest patterns is `Maybe<T>` monad
also called `Option<T>` or `Optional<T>`.
`Maybe<T>`'s primary use case is to represent a possibly
missing value. 

I have already use `Maybe<T>` a few times in real
codebases and in this post I want to gather my thoughts
on `Maybe<T>` and how, I think, it should be used.

#### Why we use `Maybe<T>`?

Most people that use `Maybe<T>` generally fall into
one of the two categories.

##### Category 1: Wants to eliminate `NullReferenceException`

For a long time before `Maybe<T>` programmers tried to
clearly state to the clients of their API that a given
method may return `null` instead of an object.
Some of them used special naming conventions or 
comments, for example:
{% highlight csharp %}
// Naming convention and XML documentation
// comments in action.
public interface IUserRepository {
    /// <returns>
    /// Returns <c>null</c> if user is not found.
    /// </returns>
    User FindById(UserId id);

    /// <exception cref="EntityNotFound">
    /// If user is not found.
    /// </exception>
    User FindRequiredById(UserId id);
}
{% endhighlight %}
Others resorted to using special marking attributes and
static code analysis tools. 
A good example of this category is 
[JetBrains.Annotations](https://www.nuget.org/packages/JetBrains.Annotations) package, that can be used together with ReSharper
to detect missing null checks:
{% highlight csharp %}
public interface IUserRepository {
    [CanBeNull]
    User FindById(UserId id);
}

public interface IUserService {
    void ActivateUser([NotNull] User user);
}
{% endhighlight %}
Yet another solution to this problem were 
[Code Contracts](https://www.infoq.com/articles/code-contracts-csharp)
developed by Microsoft.

None of those solutions is perfect and `Maybe<T>` seems
to offer a better alternative. 
Why? Because it is checked by the compiler,
does not require additional tools and does not slow
down compilation.
But remember there is 
[no silver bullet](https://en.wikipedia.org/wiki/No_Silver_Bullet),
and `Maybe<T>` is not perfect either.

We can use `Maybe<T>` like this:
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
One good library that I can recommend is: 
[CSharpFunctionalExtensions](https://github.com/vkhorikov/CSharpFunctionalExtensions).

If you choose a different library, please make sure to check
that `Maybe<T>` is implemented using `struct`, otherwise you
may be surprised:
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
Unfortunately it was very difficult to provide a comprehensive
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
From this question alone we may learn e.g. to never wrap
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

Fortunately for us there is more and more C# posts about
using `Maybe<T>`. For example [this one](https://enterprisecraftsmanship.com/2015/03/13/functional-c-non-nullable-reference-types/)
from the author of CSharpFunctionalExtensions library.

Although I cannot provide you with a list of best practices,
I think I have gathered enough experience to provide
you with a list of `Maybe<T>` code smells:

* Nested `Maybe`s are wrong, for example `Maybe<Maybe<string>>`.
 Usually this is a sign that you should replace one of
 `Map` calls by a `FlatMap` (alternatively a `Select` by a `SelectMany` call).
* `Maybe`s that wrap collections are wrong, for example `Maybe<List<User>>`.
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
that start in "Category 1", slowly begin to embrace more FP approach.
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
often think about using F# at work and are a bit disappointed
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
    // Always wrap them in DTOs / ViewModels / QueryResponses.
    Maybe<string> culture = GetUserCulture();
    return Maybe(culture);
}

// Presumably in the base controller
public IActionResult Maybe<T>(Maybe<T> m)
    => m.Map(value => Ok(value))
        .IfNone(() => NotFound());
{% endhighlight %} 

In this category of programmers there is also a small group
of zealots, that in my opinion go a little bit to far in their cult of monads. 
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
Yet in my opinion fluent interface is in 90% of cases 
a more readable and understandable way 
to transform `Maybe<T>`s and other monads.
For example we may rewrite the last code snippet to:
{% highlight csharp %}
var res = Combine(
        GetOptionalInt(),
        GetOptionalInt(),
        GetOptionalInt()
    )
    .Map(nnn => {
        (var n1, var n2, var n3) = nnn;
        return new { 
            Max = Math.Max(n1, Math.Max(n2, n3)),
            Min = Math.Min(n1, Math.Min(n2, n3))
        };
    })
    .Filter(m => m.Min != 0)
    .Map(m => m.Max / m.Min);

// We need a few utils
private static Option<(T,T)> Combine<T>(Option<T> a, Option<T> b)
    => a.SelectMany(
            _ => b,
            (aValue, bValue) => (aValue, bValue));

private static Option<(T,T,T)> Combine<T>(Option<T> a, Option<T> b, Option<T> c)
    => Combine(a, b)
        .SelectMany(
            _ => c,
            (tt, cValue) => (tt.Item1, tt.Item2, cValue));
{% endhighlight %}
Not as pretty as LINQ query but still readable. 

At the end of the day consistency is what matters on real
projects. Choose one style and follow it consistently.

In this category we find libraries like 
[LanguageExt](https://github.com/louthy/language-ext).
This library has many flaws but still it is the best 
functional library on the market. 
My biggest disappointment with LanguageExt is poor documentation,
which basically consists of just a list of functions without any guidelines how
this library should be used and how it affects overall architecture.
Compare this with [Vavr](https://www.vavr.io/vavr-docs/)
(the most popular FP library for JVM) and you can clearly
see the difference.

If you decided that you want to use FP in you code, you
should definitively check awesome
[Railway oriented programming](https://fsharpforfunandprofit.com/rop/)
talk.

`Maybe<T>` is not the only monad that is popular, other
frequently used one is `Either<L,R>`. 
`Either<L,R>` is used to represent either a result of computation or an error.
You may think of `Either<L,R>` as a functional response to exceptions.
If you want to use `Maybe<T>` efficiently, you must learn 
how it can be transformed it into other monads, in particular into `Either<L,R>`.
E.g. we may make our last example more robust if we provide
information to the user why the computation failed:
{% highlight csharp %}
var result = Combine(
    GetOptionalInt(),
    GetOptionalInt(),
    GetOptionalInt()
    )
    .Map(ttt => {
        (var n1, var n2, var n3) = ttt;
        return new { 
            Max = Math.Max(n1, Math.Max(n2, n3)),
            Min = Math.Min(n1, Math.Min(n2, n3))
        };
    })
    .ToEither(() => Error("Not all values are available."))
    .Bind(m => Divide(m.Max, m.Min)); // FlatMap

Either<Error, int> Divide(int a, int b) {
    if (b == 0) return Left(Error("Cannot divide by zero"));
    return Right(a / b);
}

// Helper classes:
public class Error {
    public string Message { get; }

    public Error(string message) {
        Message = message;
    }

    public override string ToString()
        => $"Error({Message})";
}

public class ErrorHelpers {
    // For `using static` import...
    public static Error Error(string message)
        => new Error(message);
}
{% endhighlight %}

Since FP is on the rise, you will find a lot of books, blogs, podcasts
and MOOC's about using FP in C#. Also .NET has amazing F# community
that is very welcoming to the beginners.
One of the best blogs about FP in C# is in my opinion
[Mark Seemann blog](http://blog.ploeh.dk/archive/).

#### What to do with None?

How much value you will be able to extract from `Maybe<T>` depends on
your attitude towards `None`s. 
Every time when you have to handle `None`, you must decide if it is 
the result of 
[the accidental complexity](https://www.quora.com/What-are-essential-and-accidental-complexity)
e.g. someone passed a wrong id to the REST API) 
or if you just discovered a new edge case in your domain.

To better understand the problem let's follow an imaginary example.
Joe must write a simple function that will
send an email message to all users whose subscriptions will end in the next month.
During implementation Joe notices that `EmailAddress` field in `User` entity 
is declared as `Option<Email>`:
{% highlight csharp %}
public class User {
    public Option<Email> EmailAddress { get; }
    // ...
}
{% endhighlight %}
Now Joe knows that for some strange reason not all users have email addresses.
Joe logs into production DB to confirm that some email addresses are missing 
and indeed they are. Looks like Joe just discovered a new edge case.
Joe goes to Mark a business analyst to describe the problem. Mark is a long
timer in the company and knows that for a short period of time users
were able to log into the platform using their phone numbers instead of emails.
A new solution is created. Users that have no email address will receive 
a text message instead of an email. Also users without email will be asked to
enter their email address next time they log into the platform. Success!

On the other hand consider what will happen if Joe just
dig out the email address from `Maybe<T>` by accessing `Value` or if he just
log a warning about missing email address 
without telling anyone from the business side?

##### End of the part I 

Soon I will write a follow up to this post in which 
we will try to implement a perfect `Maybe<T>` type on our own and we will see
that it is not an easy task in C#.

