---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Inheritance? Just say no!
date: 2018-12-12 00:00:00
tags: dotnet architecture
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently during a code review I have found the following piece
of code:
{% highlight csharp %}
public class TemplateCache 
    : ConcurrentDictionary<TemplateName, Template> { }
{% endhighlight %}
Here the programmer broke one of the most fundamental principles
of modern object oriented programming:

> Prefer composition over inheritance

Why inheritance is bad in most of the cases? Here are the reasons:

###### Watered down component API

What methods would you expect on a cache? Something that gets
values from the cache if they are already there. Let us call 
this operation `TryGetValue(cacheKey, out value)`. 
And of course a method to
add a new or overwrite an existing cache entry, let's call it
`SetValue(cacheKey, value)`. Do we need more methods on a cache
from the client point of view? Maybe in the future we will want to
extend `SetValue` operation to allow client to specify for how
long items added to the cache should be stored? Who knows. 
But still we would end up with only two operations. 

> NOTE A truly generic and reusable cache 
> is usually slightly more complicated - instead of two
> we have three methods! For example please see
> [IMemoryCache](https://github.com/aspnet/Caching/blob/master/src/Microsoft.Extensions.Caching.Abstractions/IMemoryCache.cs) interface.

On the other hand if we use inheritance we end up with something 
like this:
![Cache API when we use inheritance](assets/images/2018-12-12/cache_api.png)
This is much more than we asked for. We actually get operations
that make no sense for a cache like `IsEmpty`. I mean either an item
that we are looking for is in the cache or it is not - who cares
if the cache is empty itself? 

I hope that I managed to persuade you that a good component
API should be small, focused and easy to use. We get none of these 
if we use inheritance.

###### Broken encapsulation

By using inheritance we are making it clear to the clients of
our component that it is implemented using `ConcurrentDictionary` class.
If we wait long enough we will notice that some of them 
will start relaying on that knowledge in their code. 
For example they may use `ContainsKey` method for checking if
the cache contains a given entry. 
What will happen later, when we decide that we want to change 
the cache implementation and use for example 
[IMemoryCache](https://dotnetcoretutorials.com/2017/03/05/using-inmemory-cache-net-core/) instead?
Clients of our component will get angry, because
our new version of the cache  
introduced a breaking change into their code.

Just to sum up: Inheritance both exposes implementation
details of components and makes evolution of their APIs more difficult.

###### Liskov substitution principle is violated 

In short some operations that make sense for a dictionary
may not make sense for a cache. For example it makes no
sense to cache a template that does not exists, yet with
inheritance we may write:

{% highlight csharp %}
var foo = new TemplateName("foo");

ConcurrentDictionary<TemplateName, Template> dict 
   = new TemplateCache();

dict.GetOrAdd(foo, (Template)null);

// Ops we have a null template here...
Console.WriteLine("value is: " + 
   dict.GetOrAdd(foo, (Template)null));
{% endhighlight %}

When we use inheritance we are telling the type system that
`TemplateCache` *is a* `ConcurrentDictionary`. 
From logical point of view this makes no sense. They are two
different components that have two different purposes and also
different usage patterns. 
They should have nothing in common.

> BTW You should avoid putting `null`s into collection classes of any sort.

Let's finish this post by seeing how composition can be used
to improve our `TemplateCache` component:
{% highlight csharp %}
public class TemplateCache {
  private readonly ConcurrentDictionary<TemplateName, Template> _cache 
      = new ConcurrentDictionary<TemplateName, Template>();

  public bool TryGetTemplate(TemplateName name, out Template template)
      => _cache.TryGetValue(name, out template);

  public void AddTemplate(Template template)
      => _cache.AddOrUpdate(
          template.Name, template, (name, existing) => template);
}
{% endhighlight %}
Yep, simple, clean and easy to use!

