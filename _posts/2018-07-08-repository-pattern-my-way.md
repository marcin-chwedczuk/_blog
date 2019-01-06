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
published: true 
---

### Generic repository pattern

First, to avoid misunderstandings, let me explain what I understand
by generic repository. Have your ever seen an interface like this:
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
Or maybe you saw it's twin brother that have a slightly 
different variant of `Get` method:
{% highlight csharp %}
IQueryable<TEntity> GetAll();
{% endhighlight %}

Inspiration for the first of these examples comes from 
[official Microsoft documentation for ASP.NET MVC 4](https://docs.microsoft.com/en-us/aspnet/mvc/overview/older-versions/getting-started-with-ef-5-using-mvc-4/implementing-the-repository-and-unit-of-work-patterns-in-an-asp-net-mvc-application#implement-a-generic-repository-and-a-unit-of-work-class).
As for the second example you can find countless number of blogs that
describe this variant of the repository pattern e.g.
[here](http://www.tugberkugurlu.com/archive/generic-repository-pattern-entity-framework-asp-net-mvc-and-unit-testing-triangle),
[and here](https://deviq.com/repository-pattern/),
[and also here](https://www.codeproject.com/Articles/814768/CRUD-Operations-Using-the-Generic-Repository-Patte)
sometimes with slight variantions like returning `IEnumerable<TEntity>` instead of
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
But this problem can be easily solved by splitting this interface into three -
one for reading, one for updating and one for deleting entities.

The real problem that I have with these interfaces comes from their *improper*
usage. The original idea behind them is that they should be used as a base
interfaces for your custom repository interfaces, just like this:
{% highlight csharp %}
public interface IFooRepository : IGenericRepository<Foo> {
    Foo FindNewest();
    IEnumerable<Foo> FindAllOutdated();
}
{% endhighlight %}
And that your command handlers and services 
(in other words clients of your custom repositories) 
should decide what methods are
needed and should be put on your custom repository interfaces.

That is the theory. Unfortunately what I already saw a few times in my career 
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
            .ToArray();

        return _mapper.MapTo<NewestOrderDto>(newestOrders);
    }
}
{% endhighlight %}

This *looks* nice and clean but is not. I will tell you more about why
this is wrong later. Now I want to deal with one "solution" to the
`GenericRepository<T>` misinterpretation that 
I often hear from other developers. 
This solution sounds like this (dialog during code-review):

JIM SENIOR: Have you ever heard that
NHibernate `ISession` or Entity Framework `DbSet` *is a* repository?
Indeed what you just created is a tin wrapper over either 
`ISession` or `DbSet`.
Actually we can replace this `GenericRepository<T>` by e.g.
`DbSet` and get pretty must the same results.
The only service that `IGenericRepository<T>` provides is that it hides
most of the thirty methods that `DbSet` has. 
JONNY JUNIOR: Oh, indeed what you just said make sense.
I guess using generic repository
pattern here was a bit of overengineering. (Happily gets back to coding...)

For me using either `GenericRepository<T>` or raw `DbSet` is wrong most of the
time (one exception that I can accept is when you write 
the most CRUDest application ever, then don't bother
and use `DbSet` in your services). And why? Due to the following reasons:

- The only option to make sure that your LINQ queries will be properly translated
 to SQL is to test them against **the same** kind of database that you use 
 in production environment. But when your queries are scattered over methods 
 of your services it may be hard to create integration tests for them.
 For example look at the code:

{% highlight csharp %}
if (/* some complicated condition */) {
	if (/* some other complicated condition */) {
		 var result = _orderRepository.GetAll()
			  .Where(order => order.AssignedTo.Id == _currentUser.Id)
			  .Where(order => order.State != OrderState.Closed)
			  .OrderByDescending(order => order.CreationDate)
			  .Take(10)
			  .ToArray(); 

		 return _mapper.MapTo<NewestOrderDto>(newestOrders);
	}
	// some code here
}
// more code here
{% endhighlight %}

To execute above query you must fulfill two if's conditions. This will make
an integration test for the above query less readable and more fragile. 
Instead imagine that this query is encapsulated by a repository method.
In integration test you would just call that repo method and check the 
results - simple isn't it?

- I am sure that you agree with me 
 that inline LINQ queries inside services 
 are not reusable and that they have a nasty tendency to
 duplicate themselves over the codebase. Even when a programmer decides to
 extract query to it's own method, it will usually be a private method on 
 a particular service. Moving queries to repository 
 methods makes them automatically reusable
 across entire application. 

- Inline LINQ queries are not named. Usually the only clue what a particular
 query does (without going deep it's logic) is the name of the variable that
 holds query result. Unfortunately for us inventing a good variable names is a skill
 that only comes with the experience and since we have a lot of junior devs in our 
 industry we are faced with names like `result`, `ordersToProcess` or just `orders`.
 Wrapping the query inside a repo method will automatically give it a name. 
 Even if this name is not perfect we can refactor it later and all places 
 that call this method will benefit from our refactoring automatically!

- Sometimes for performance reasons we are forced to use raw SQL to get our
 data from DB. Do you really want to litter your business logic with low
 level technical stuff like `DbConnection`s, query parameters and `SqlException`s?
 Let's hide this low level stuff inside a repository and let our business code 
 concentrate on business logic. Also see 
 [Single level of abstraction principle](http://principles-wiki.net/principles:single_level_of_abstraction).

So what is the solution you may ask? Get ready...

### What we need is the "specific" repository pattern

We should start repository design by specifying it's interface. 
The interface should contain only methods required by clients of 
the repository. In other words if nobody needs to delete entities of a given type
or it does not make sense from business point of view
we will not add `Delete` method to the interface.

If you are afraid that you will end up with different names for
basic CRUD operations like `Delete` on one repo and `Remove` on the other
you may create helper interfaces like `ICanDeleteEntity<TEntity>`,
`ICanUpdateEntity<TEntity>` etc. that will contain only methods for
specific usage like deleting, updating etc. 
Then the repository interface can inherit 
appropriate subset of them.

None of the methods on the repository interface should return `IQueryable<T>`
type.
Also make sure that the repository implementation does not 
return `IQueryable<T>` value hidden as `IEnumerable<T>` one. 
Always call `ToList()`
or `ToArray()` to materialize query results before returning them 
to the client.

When it comes to the repository implementation, the implementation is free
to inherit from *abstract* `GenericRepository<TEntity>` base class. 
Alternatively it may use `ISession` or `DbSet` directly if it is more convenient. 
No matter what approach you choose remember that "excessive" methods
like `Delete`
inherited from base class
may be hidden by the repository interface.

Please remember that your repository is NOT responsible for managing
database transactions. This concern is best managed using 
[Unit of Work pattern](https://martinfowler.com/eaaCatalog/unitOfWork.html).
This pattern is already implemented by both `ISession` and `DatabaseContext`
(think change tracking and dirty checking),
we only need a better interface over them:
{% highlight csharp %}
public interface IUnitOfWork {
    // or just Begin()
    void BeginTransaction();

    void Commit();
    void Rollback();
}
{% endhighlight %}

For the most web applications it is enough to start transaction using `IUnitOfWork`
at the beginning of the HTTP request and either `Commit` or `Rollback` at
the end of the request. This can be done by using either an action filter
or a decorator around command handlers and/or services. 

Example repository created using the above guidelines:
{% highlight csharp %}
public interface IOrderRepository {
	// We do not need FindById so we do not included it
	IEnumerable<Order> FindActiveOrdersAssignedToUser(UserId id); 
}

public class OrderRepository : GenericRepository<Order>, IOrderRepository {
    public IEnumerable<Order> FindActiveOrdersAssignedToUser(UserId id) {
        return base.FindAll()
                .Where(order => order.AssignedTo.Id == id.Value)
                .Where(order => order.State != OrderState.Closed)
                .ToArray();
    }
}
{% endhighlight %}

This should be obvious by now, but let's not take chances.
Every method of our repositories should be covered by one or more
integration tests, which should use the same kind of DB that we use 
in production environment. Remember always use *integration* tests to
test your repositories.

### Turbocharging the repository pattern

There is no rose without thorns and presented above approach also has some
serious drawbacks. Some of them can be fixed by using a different
architecture than classic 3-layer arch.
Most common problems with "specific" repositories are as follows:

- Repositories can over long periods of time accumulate 
 dozens and dozens of `Find*` methods. Often these methods will be very similar
 to each other. There are two ways to combat this unwanted grow. One is to use 
 a query object pattern. Basically you group several of these `Find*` methods together
 into one more general `Find` method. That method should accept an object that will
 represent a query criteria. For example:

{% highlight csharp %}
var ordersToCancel = _orderRepository.FindAllMatching(
	// Alternatively you may use the builder pattern
	// to create a criteria object.
	new OrderCriteria {
		StatusIsIn = new[] { OrderStatus.New, OrderStatus.InProgres },
		OrderedItemsContainAll = new[] { searchedItem },
		CustomerIs = GetCurrentCustomer()
	});
{% endhighlight %}

To create a query from the criteria object we examine each search criteria and
build query step-by-step:
{% highlight csharp %}
IQueryable<Order> q = base.FindAll();

if (criteria.StatusIsIn != null) {
	q = q.Where(o => criteria.StatusIsIn.Contains(o.Status));
}

// A long list of other conditions here..

return q.ToList();
{% endhighlight %}

A closely related yet different aproach is to use the query object pattern (see 
[this](https://martinfowler.com/eaaCatalog/queryObject.html) and
[this](https://lostechies.com/jimmybogard/2012/10/08/favor-query-objects-over-repositories)).

The second solution to this problem is more robust and reliable.
Usually too big repositories are accompanied by huge services and 
overgrown entities. You can slim down both your repos and services 
by using something that I call CQRS-light. It differs from full-blown
CQRS by using exactly the same database tables for both reads and writes.
When doing CQRS-light we can use the same ORM framework for both reading and
writing data and slowly migrate to real CQRS only in these parts of our
application that really need it (do recall this 80+ columns searchable grid that
generates 20+ inner join query that halts your DB server? - real CQRS can help here).

The diagram below presents typical architecture of CQRS-light application:
![CQRS-light architecture](assets/images/2018-07-08/cqrs-light.svg)

The key principles of CQRS-light are:

- Split all user actions into two categories. In the first put all actions that
 can modify the state of the system like e.g. creating a new order in an e-commerce app.
 In the second  
 category put all actions that do not modify state of the system e.g. 
 viewing an order details. First category represents commands (writes), the second one
 queries (reads). Only commands can change state of the system.

- Query handlers do NOT use repositories to access data. They access DB 
 using whatever technology they want.
 Usual configurations include a single ORM on both read and write sides, 
 ORM for writes and micro-ORM like Dapper for reads or 
 using ORM for writes and raw SQL for reads.

- Command handlers can only use repositories to access and modify data. 
 Command handlers 
 should not call query handlers to fetch data from database. 
 If a command handler needs to execute 
 a complex query and this query can be answered by a query handler
 you should duplicate this query logic and put it
 in both query handler and in a repository method
 (read and write sides must be separated).

- Query handlers are tested only using integration tests.
 For command handlers you will have unit and optionally integration tests.
 Repositories will be tested using integration tests.

CQRS even in the "light" version is a huge topic and deserves a blog post of it's own.
[MediatR](https://github.com/jbogard/MediatR) library is a good starting point
if you want to find out more about CQRS-light approach.

Let us return to the subject of the "specific" repository pattern drawbacks. 
The second drawback that I want to mention is unwanted migration of the business
logic into query definitions. For example even this simple query:
{% highlight csharp %}
public IEnumerable<Order> FindActiveOrders() {
  return base.FindAll()
          .Where(order => order.State != OrderState.Closed 
                       && order.State != OrderState.Canceled)
          .ToArray();
}
{% endhighlight %}
contains a piece of business logic that describes what 
it means for an order to be active.
Usually ORM's prevent us from encapsulating such pieces of logic
into a separate properties like `IsActive`.

What we need here is the specification pattern.
You can find pretty decent overview of the specification pattern
[here](https://enterprisecraftsmanship.com/2016/02/08/specification-pattern-c-implementation/).
Our query method when we use the specification pattern should look similar to:
{% highlight csharp %}
public IEnumerable<Order> FindActiveOrders() {
  return base.FindBySpec(new ActiveOrders())
          .ToArray();
}
{% endhighlight %}


