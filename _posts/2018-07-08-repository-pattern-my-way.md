---
layout: post
cover: 'assets/images/park_cover_1.jpg'
title: How NOT to use the repository pattern
date: 2018-07-08 00:00:00
tags: architecture 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
published: false
---

### Generic repository pattern

First, to avoid misunderstandings, let me explain what I understand
by genric repository. Have your ever seen an interface like this:
{% highlight csharp %}
public interface IGenericRepository<TEntity> 
    where TEntity : class 
{
    IEnumerable<TEntity> Get(
        Expression<Func<TEntity, bool>> filter = null,
        Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>> orderBy = null,
        string includeProperties = "");
    TEntity GetById(object id);

    void Insert(TEntity entity);

    void Update(TEntity entityToUpdate);

    void Delete(object id);
    void Delete(TEntity entityToDelete);
}
{% endhighlight %}
Or maybe you saw it's twin brother that have a slighty 
different variant of `Get` method:
{% highlight csharp %}
IQueryable<TEntity> GetAll();
{% endhighlight %}

Inspiration for the first of these examples comes from 
[official Microsoft documentation for ASP.NET MVC 4](https://docs.microsoft.com/en-us/aspnet/mvc/overview/older-versions/getting-started-with-ef-5-using-mvc-4/implementing-the-repository-and-unit-of-work-patterns-in-an-asp-net-mvc-application#implement-a-generic-repository-and-a-unit-of-work-class).
As for the second example you can found countless number of blogs that
describe this variant of the repository pattern e.g.
[here](http://www.tugberkugurlu.com/archive/generic-repository-pattern-entity-framework-asp-net-mvc-and-unit-testing-triangle),
[and here](https://deviq.com/repository-pattern/),
[and also here](https://www.codeproject.com/Articles/814768/CRUD-Operations-Using-the-Generic-Repository-Patte)
somethimes with slight variantions like returning `IEnumerable<TEntity>` instead of
`IQueryable<TEntity>`. 
And in the later case often with an additional method for generating
queries like:
{% highlight csharp %}
IEnumerable<T> FindAll(Expression<Func<T, bool>> predicate);
{% endhighlight %}

So what is wrong with them you may ask? So far almost nothing,
not counting of course badly naming of the methods from Microsoft example(
they should be called `Find` and `FindAll` not `Get` and `GetAll`).

But "almost nothing" does not equal "nothing". One problem that I find with
these interfaces is that they violate Interface Segregation Principle.
They expose full set of CRUD operations even for entities for which 
e.g. deleting does not make sense (for example when you deactivate users
instead of deleting them from DB;
also see [Udi Dahan post about deleting data](http://udidahan.com/2009/09/01/dont-delete-just-dont/)).
But this problem can be easily solved by spliting this interface into three -
one for reading, one for updating and one for deleting entities.

The real problem that I have with these interfaces comes from their *improper*
usage. The original idea behind them is that they should be used as a base
interfaces for your custom repository interfaces, just like this:
{% highligh csharp %}
public interface IFooRepository : IGenericRepository<Foo> {
    Foo FindNewest();
    IEnumerable<Foo> FindAllOutdated();
}
{% endhighlight %}
And that your command handlers and services 
(in other words clients of your custom repositories) 
should decide what methods are
needed and should be put on your custom respository interface.

That was the theory. Unfortunately what I already saw a few times in my career 
instead is this:
{% highlight csharp %}
// notice: this is NOT an abstract class
public class GenericRepostiory<TEntity> : IGenericRepository<TEntity> {
    // implementation details skiped

    public IQueryable<TEntity> GetAll() { /* code */ }
    public TEntity GetById(object id) { /* code */ }

    public void Insert(TEntity entity) { /* code */ }
    public void Update(TEntity entityToUpdate) { /* code */ }

    public void Delete(object id) { /* code */ }
    public void Delete(TEntity entityToDelete) { /* code */ }
}
{% endhighlight %}
Someone has created a working implementation of `IGenericRepostory` interface.
What is worse this implementation is almost always registered in IoC container and
can be injected into your command handlers and
services like any other dependency:
{% highlight csharp %}
public class OrderService {
    private readonly IGenericRepository<Order> _orderRepository;

    // ctor and other stuff...

    public NewestOrderDto FindNewestOrderForCurrentUser() {
        var newestOrders = _orderRepository.GetAll()
            .Where(order => order.AssignedTo.Id == _currentUser.Id)
            .Where(order => order.State != OrderState.Closed)
            .OrderByDescending(order => order.CreationDate)
            .Take(10)
            .ToList();

        return _mapper.MapTo<NewestOrderDto>(newestOrders);
    }
}
{% endhighlight %}

- Thin abstraction over DbSet
- With EF Core InMemeoryDatabase testing is easy
- Explicit transaction management (disables optimization done by orm), can break someone elses code when performing complex operations (data import).

TODO: Why using raw DbSet is not the best option:

- Inline named queries that are difficult to understand (variable name may be a good or bad suggestion - when it was not updated). Query logic is copied in multiple places. 
- Diff. levels of abstraction for some queries you will want to use SQL.
- Queries can only be reliably tested by integration tests with real database.
 Do not use SQLite if you use Postgres on production, run tests on the same DB
 type that you use on PROD. You don't want to integration-test everything (integs are slow)
- Breaks interface segregation principle (some operations like delete should not be exposed for some aggregates because we have soft delete). Can read any entity, manage transactions etc.

### What we need is the "specific" repository pattern

- Interface exposes only methods that are really needed (soft delete - means no delete operation).
- Transactions are managed by the unit-of-work pattern.

### Turbocharging the "specific" repository pattern

- Over time repository interfaces may accumulate a lot of query methods (`Find*`). To prevent this introduce CQS separation into your application.
- Queries have different needs that business logic. They often need paging and filtering support. When DB store supports it we may use read-only transactions on Query site. No tracking is often used.
- Use DbSet's on Query side. Test using integration tests.
- Instead of creating one big query don't be shy to pull data out of
 say 3 repositories and then to combine them on query side.
- Do NOT use queries from query side in business logic (instead put all
 necessary information into command that may be created from the result of
 query).
- One only disadvantage of this apporach is that some part of business
 logic can be duplicated in repository and in query. If your system uses
 data warehouse or other advance reporting soultion the changes that some
 business logic is already duplicated in SQL are big.

TODO: Use Specification pattern to combat business logic duplication:

- Wrap business condition into separate classes. Tread these classes as
 predicates, use them to generate a query in repository and query class.
- Requires more work and discipline

