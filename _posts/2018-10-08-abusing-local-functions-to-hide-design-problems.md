---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Abusing local functions to hide design problems
date: 2018-10-08 00:00:00
tags: dotnet architecture
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I was browsing through a certain code base
and I saw a code similar to this:
{% highlight csharp %}
public class EnterpriseNotificationSender {
    private readonly IUserManagementService _userManagementService;
    // ctor and stuff...
  
    public void SendNotificationsToUsers(string companyId) {
        var addresses = GetRecipientsAddresses(companyId);
        foreach(var address in addresses) {
            SendNotification(address);
        }
    }
  
    private IEnumerable<EmailAddress> 
                     GetRecipientsAddresses(string companyId) {
        return _userManagementService
             .FindUsersBelongingToCompany(companyId)
             .Where(UserShouldReciveNotification)
             .Select(user => user.EmailAddress)
             .ToList();
  
        bool UserShouldReciveNotification(User user) {
            return user.EmailAddress != null
                && user.IsRegistered
                && !user.IsDisabled;
        }
    }
  
    private void SendNotification(EmailAddress address) {
        // do stuff...
    }
}
{% endhighlight %}
Especially `GetRecipientsAddresses` method draw my attention.
Someone extracted quite complicated lambda expression
to a local function.
At first I thought that this is indeed a very nice usage for local
functions.
LINQ query is much more readable
with expressions like `Where(UserShouldReciveNotification)`
instead of long lambdas.

It took me a while to realize that the local function
in the code above, was used to hide design problems.
Let's take a closer look at the condition encapsulated by
`UserShouldReciveNotification` function:
{% highlight csharp %}
return user.EmailAddress != null
    && user.IsRegistered
    && !user.IsDisabled;
{% endhighlight %}
We should deal with the simplest to fix problems first:

**Bad naming:** We should always format predicates in "a positive way".
For examples we should prefer `IsOpen` and `IsAvailable` to `IsClose`
and `IsUnavailable`. Here `IsDisabled` should be named `IsEnabled`.
As a first step in refactoring we may add `IsEnabled` property
to the `User` class:
{% highlight csharp %}
public bool IsEnabled => !IsDisabled;
{% endhighlight %}

**Unreadable condition:** If a user has optional email then we may expect
that our codebase is littered with little `user.EmailAddres != null` checks.
To increase readability we should encapsulate this check into a separate property:
{% highlight csharp %}
public bool HasEmailAddress => (EmailAddress != null);
{% endhighlight %}

**Missing entity attributes:** When I looked closely at the condition
`user.IsRegistered && !user.IsDisabled` I found out that it occurs
in many places in that codebase. For some reason the system was creating
users before they actually registered. A user that not registered yet was basically
a stub not a real user. Users could also be disabled by admins (registered or not),
this is what the second part of the condition was responsible for.
Clearly `User` entity is missing an attribute that could tell us whatever
a user is active, so let's add one:
{% highlight csharp %}
public bool IsActive
    => IsRegistered && IsEnabled;
{% endhighlight %}

After all these refactorings we may finally rewrite our LINQ query:
{% highlight csharp %}
return _userManagementService
    .FindUsersBelongingToCompany(companyId)
    .Where(user => user.IsActive)
    .Where(user => user.HasEmailAddress)
    .Select(user => user.EmailAddress)
    .ToList();
{% endhighlight %}
This version is as readable as version with the local function,
but does not attempt to hide code smells.

Conclusion: Every time when you have a too long or too complicated
lambda expression, that you what to extract to a local function,
think if you can simplify that lambda by extracting conditions and checks
into new methods and properties on processed objects.

