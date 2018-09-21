---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Avoid hidden coupling to interface implementation
date: 2018-09-21 00:00:00
tags: dotnet architecture
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

A few days ago I was doing a code-review at work and
one line of code catch my eye:
{% highlight csharp %}
var @event = new CupOfCoffeeReadyEvent(/* ... */);
_logger.LogInformation("Publishing cup of coffee event: {@Event}.", @event);
_mediator.Publish(@event);
{% endhighlight %}
Since we are using interfaces from `Microsoft.Extensions.Logging.Abstractions`
package and also since variable name starts with `@` I thought that
the log statement contains an error and instead it should be written as:
{% highlight csharp %}
// {@Event} -> {Event}
_logger.LogInformation("Publishing cup of coffee {Event}.", @event);
{% endhighlight %}
So I put a friendly comment that this logging statement should be fixed.
After half an hour, instead of a fix I get the following response:

> In this service we are using Serilog as third-party logging provider.
> In Serilog `@` is used as destructuring operator,
> please see: https://github.com/serilog/serilog/wiki/Structured-Data#preserving-object-structure
> Basically this means that the parameter will be logged in JSON form.

So at least I knew that `@` character was put there on purpose. 
But there was still something fishy about this code. 
On the one hand we are using `ILogger` from 
`Microsoft.Extensions.Logging.Abstractions` to decouple ourselves 
from any specific logging provider,
on the other hand we are using Serilog specific extensions.
This results in a false sense of security. 
We may think that since we are
using standard `ILogger` changing logging implementation to e.g.
Azure Web App Diagnostics would be as simple as changing `Startup` 
file of our application.
Unfortunatelly since we coupled ourselves with Serilog specific 
syntax some of our log statements will not work with 
Azure Web App Diagnostics provider.

So what is the solution to this problem? We must choose whatever we
want to use Serilog specific extensions. If the answer is yes, then 
we should not hide the fact that we are using Serilog. Fortunatelly for
us Serilog provides it's own, ready to use `ILogger` interface.

On the other hand, if we expect that we may need to change logging
provider in the future, we should stick with 
`Microsoft.Extensions.Logging.Abstractions` `ILogger` and we should
use only the features that are described in 
[the official documentation](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-2.1). 
If our needs are not fully covered
by standard `ILogger` e.g. we must log objects as JSON, then we must implement them
ourselves by e.g. creating wrappers around parameters:
{% highlight csharp %}
_logger.LogInformation(
    "Publishing cup of coffee {Event}.", new LogAsJson(@event));
{% endhighlight %}

It is really interesting that a similar coupling happens when using
`IEnumerable<T>` interface as a return type of a method.
How many times have you seen a code similar to:
{% highlight csharp %}
class UserSerivce {
	public IEnumerable<User> FindAllUsers() {
		return new List<User> {
			new User { IsActive = true },
			new User { IsActive = false }
		};
	}
	public void SaveAll(params User[] users) {
		foreach (var user in users) {
			Console.WriteLine(user.IsActive);
		}
	}
}

public class User {
	public bool IsActive { get; set; }
}

public void SomeMethod() {
	var userService = new UserSerivce();
	
	var users = userService.FindAllUsers();
	
	users
		.ToList()
		.ForEach(user => user.IsActive = false);
	
	userService.SaveAll(users.ToArray());
}
{% endhighlight %}
Again we have here a case of hidden coupling to the interface implementation.
We are using `IEnumerable<T>`
interface but we are assuming that it is backed by
a collection for which mulitple enumerations always
return the same elements. 
Our code will break 
when someone will change `FindAllUsers` implementation
e.g.:
{% highlight csharp %}
public IEnumerable<User> FindAllUsers() {
	yield return new User { IsActive = true };
	yield return new User { IsActive = false };
}
{% endhighlight %}

The solution to this problem is honesty. If you have
a value of type `IEnumerable<T>`, tread it as 
a value of type `IEnumerable<T>`. Nothing more, nothing less.
Do not assume that multiple enumerations
will return the same elements - this is not guaranteed by that interface.

If you want to return a sequence of elements from a method with
this additional guarantee, then please use a more specific 
interface like `ICollection<T>` or `IReadOnlyList<T>` or 
maybe even something from `System.Collections.Immutable`.


