---
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Castle Windsor most popular features
date:   2016-09-11 00:00:00
tags: CSharp 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will present the most popular 
[Castle Windsor](http://www.castleproject.org/projects/windsor/) features
encountered in typical enterprise applications. 

> Source code: [https://github.com/marcin-chwedczuk/castle-windsor-most-popular-features](https://github.com/marcin-chwedczuk/castle-windsor-most-popular-features)

##### Typed factory

When I follow good software development practices like
[SOLID](https://en.wikipedia.org/wiki/SOLID_(object-oriented_design))
I find myself writing plenty of [factory](https://en.wikipedia.org/wiki/Factory_(object-oriented_programming)) classes.
These factory classes often fall in one of the two categories:

* I need to create instance of generic service for specific type e.g. I want to get 
 service that implements `ICommandHandler<TCommand>` for `TCommand` type
* I must pass parameters and/or configuration to the service before I
 can use it e.g. `HeuristicSearch` service has `quality` constructor parameter
 to decide what solutions are good enough for the user

In cases like these we can use typed factory feature to generate
factory implementations:
{% highlight csharp %}
// to enable typed factory we must add TypedFactoryFacility
// to the container
container.AddFacility<TypedFactoryFacility>();

// case  I: get generic service instance for specific type
public interface ICommandHandler<TCommand> {
    void Handle(TCommand command);
}
public interface ICommandHandlerFactory {
    ICommandHandler<T> Create<T>();
    void Release<T>(ICommandHandler<T> instance);
}
public class AddUserCommandHandler : ICommandHandler<AddUserCommand> {
    public AddUserCommandHandler(/* dependencies */) { ... }
    public void Handle(AddUserCommand command) { ... }
}

container.Register(
    Component.For<ICommandHandler<AddUserCommand>>()
        .ImplementedBy<AddUserCommandHandler>()
        .LifeStyle.Transient,

    // tell Windsor that it should generate factory for me
    Component.For<ICommandHandlerFactory>()
        .AsFactory()
    );

// usage
ICommandHandlerFactory factory =
        container.Resolve<ICommandHandlerFactory>();

ICommandHandler<AddUserCommand> handler =
    factory.Create<AddUserCommand>();

handler.Handle(new AddUserCommand());

factory.Release(handler);

// case II: pass configuration to the service
public interface IGreeter {
    void Greet();
}
public interface IGreeterFactory {
    IGreeter Create(string greeting);
    void Release(IGreeter instance);
}
public class ConsoleGreeter : IGreeter {
    ...
    public ConsoleGreeter(string greeting
        /* you may add other dependencies here,
         * e.g. ITextWrapper wrapper */) { ... }
}

container.Register(
    Component.For<IGreeter>()
        .ImplementedBy<ConsoleGreeter>()
        .LifestyleTransient(),

    // tell Windsor that it should generate factory for me
    Component.For<IGreeterFactory>()
        .AsFactory()
    );

// usage
IGreeterFactory greeterFactory = 
    container.Resolve<IGreeterFactory>();

IGreeter helloWorldGreeter = greeterFactory.Create("hello, world!");
IGreeter goodbyeGreeter = greeterFactory.Create("goodbye cruel world!");

helloWorldGreeter.Greet();
goodbyeGreeter.Greet();

greeterFactory.Release(helloWorldGreeter);
greeterFactory.Release(goodbyeGreeter);
{% endhighlight %}

Things to remember when using typed factory:

* `Release` method in factory interface is optional.  
 It is a good practice to
 always include `Release` method in factory interface and to release all instances
 created using factory when they are no longer needed
* In case of transient or per-web-request components that are disposable
 not releasing component will result in a memory leak
* Remember that some factories should be implemented manually especially these 
 that contain domain knowledge e.g. factory that selects discount
 [strategy](https://en.wikipedia.org/wiki/Strategy_pattern) based on user profile

##### Collection resolver

Sometime we want to get all components that provide given service.
For example we may try to implement message filtering component and
we want to get all components that implement `IFilter` interface.
We may achieve this easily by using Castle Windsor `CollectionResolver`:
{% highlight csharp %}
// register CollectionResolver in the container:
container.Kernel.Resolver.AddSubResolver(
        new CollectionResolver(container.Kernel));

// demo:
public interface IFilter {
    bool IsAllowed(string message);
}

public class MessageFilterService {
    private ICollection<IFilter> _filters;

    public MessageFilterService(ICollection<IFilter> filters) {
        this._filters = filters;
    }
    ...
}

container.Register(
    Component.For<MessageFilterService>().LifeStyle.Transient,

    Component.For<IFilter>().ImplementedBy<RejectBazWordFilter>(),
    Component.For<IFilter>().ImplementedBy<FooOrBazFilter>()
);

MessageFilterService service = container.Resolve<MessageFilterService>();
service.IsAllowed("foo");
{% endhighlight %}

Since registering `CollectionResolver` requires a bit of interaction
with a container it is advisable to wrap that logic into custom facility:
{% highlight csharp %}
public class ResolveCollectionsFacility : AbstractFacility {
    protected override void Init() {
        Kernel.Resolver.AddSubResolver(new CollectionResolver(Kernel));
    }
}

// then use:
// container.AddFacility<ResolveCollectionsFacility>();
{% endhighlight %}

##### Component registration using conventions

[Convention over configuration](https://en.wikipedia.org/wiki/Convention_over_configuration)
is popular subject these days so why not to apply it to the component registration.
Instead of writing boring:
{% highlight csharp %}
Component.For<IFooRepository>()
        .ImplementedBy<FooRepository>()
        .Lifestyle.PerWebRequest,
...
Component.For<IBarRepository>()
        .ImplementedBy<BarRepository>()
        .Lifestyle.PerWebRequest
{% endhighlight %}
We may write just once:
{% highlight csharp %}
Classes.FromThisAssembly()
    .BasedOn(typeof(IRepository<>))
    .WithService.AllInterfaces()
    .Lifestyle.PerWebRequest
{% endhighlight %}

Castle Windsor is very flexible when it comes to registering components
by convention, we may scan selected assemblies and/or namespaces, we
may even select components to register by testing component `Type`.

> PITFALL: Avoid creating conventions based on type name (e.g. register all classes that
> have names ending with `Repository`) as
> much as possible. It is always better to create empty marker interface
> e.g. `IApplicationService` and use it to register all necessary components.

##### Installers

Castle Windsor installers allow us to group component registrations into
reusable pieces of code. The real power of installers comes from the fact that
we may pass them arguments or in other words we may configure them.
For example installer may take a single argument that tells what lifestyle should
be applied to all registrations contained in the installer. Such installer can
be used in both ASP.NET MVC app when most of the components will be
registered as `PerWebRequest` and in Windows service app where components will 
be registered as either `Transient` or `Singleton`.

Here is example of very simple installer:
{% highlight csharp %}
public class DummyModuleInstaller : IWindsorInstaller {
    public void Install(IWindsorContainer container, IConfigurationStore store) {
        container.AddFacility<TypedFactoryFacility>();

        // add other installers, facilities etc.

        container.Register(
            Component.For<DummyService>().LifeStyle.Transient
            // other components
            );
    }
}

container.Install(new [] {
    new DummyModuleInstaller()
});
{% endhighlight %}

##### Fallback and default components

When we start grouping registrations into installers often we will find ourselves
in situation that we want to register given service only when user of the installer
didn't provide she's own implementation. We may achieve this by passing parameters
to the installer but a fallback components are a better choice here.
Components registered as fallbacks will be used by the container only when there is no
other component that provides given service:
{% highlight csharp %}
// fallback is used when no other component
// for service is registered
container.Register(
    Component.For<IFooService>()
        .ImplementedBy<FallbackFooService>()
        .LifeStyle.Transient
        .IsFallback()
        );

Assert.That(container.Resolve<IFooService>(),
    Is.InstanceOf<FallbackFooService>());

// we may register our own component for FooService
container.Register(
    Component.For<IFooService>()
        .ImplementedBy<FooService>()
        );

Assert.That(container.Resolve<IFooService>(),
    Is.InstanceOf<FooService>());
{% endhighlight %}

Since word isn't perfect it happens from time to time that we want to
overwrite component registration for some particular service. This usually happens
because author of the installer doesn't use fallback components. But don't panic
Castle Windsor allow us to overwrite service registrations using default components:
{% highlight csharp %}
container.Register(
    Component.For<IFooService>()
        .ImplementedBy<FooService>());

Assert.That(container.Resolve<IFooService>(),
    Is.InstanceOf<FooService>());

// Without IsDefault() we
// would get an exception telling us that
// there is already component registered for IFooService
// interface.
container.Register(
   Component.For<IFooService>()
       .ImplementedBy<DefaultFooService>()
       .IsDefault()
       );

Assert.That(container.Resolve<IFooService>(),
    Is.InstanceOf<DefaultFooService>());
{% endhighlight %}

##### Interceptors

Interceptors are most powerful Castle Windsor feature that
brings power of [aspect oriented programming](https://en.wikipedia.org/wiki/Aspect-oriented_programming)
to .NET.
Interceptors can be used to implement transaction management, logging, security checks,
we may use them to gather performance related statistics and for many other purposes.

Here is a simple interceptor that log the invocations of all component methods:
{% highlight csharp %}
public class EventTracingInterceptor : IInterceptor {
    public void Intercept(IInvocation invocation) {
        EventTracer.AddEvent("BEFORE " + invocation.Method.Name);

        try {
            // call original method, we may inspect method arguments,
            // generic parameters, return value and many others
            invocation.Proceed();
        }
        finally {
            EventTracer.AddEvent("AFTER " + invocation.Method.Name);
        }
    }
}

[Interceptor(typeof(EventTracingInterceptor))]
public class Service : IService {
    public void Foo() { ... }
    public void Bar() { ... }
}

container.Register(
    // interceptors work only when you expose your
    // components via interfaces.
    // here I registered interceptors by using
    // attributes on Service class but you may also
    // use fluent api.
    Component.For<IService>().ImplementedBy<Service>(),
    Component.For<EventTracingInterceptor>()
    );

IService service = container.Resolve<IService>();
service.Foo();
{% endhighlight %}

When you start writing your own interceptors it is generally advisable to
create custom attribute e.g. `TransactionalAttribute` to mark classes that
should have interceptors attached. 
Then you should write your own facility that will scan all components
registered in container
and will attach interceptor for these marked with your custom attribute.
[Here is a good example of this approach](http://blog.willbeattie.net/2010/09/implementing-custom-castle-windsor.html)
used to implement caching.

That's all for today! Thanks for reading.
