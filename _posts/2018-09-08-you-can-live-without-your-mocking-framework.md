---
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: You can live without mocking frameworks
date: 2018-09-08 00:00:00
tags: dotnet unit-testing
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

For a long time I have been fan of mocking frameworks like 
[Moq](https://github.com/Moq/moq4/wiki/Quickstart)
and [NSubstitute](http://nsubstitute.github.io).
These libraries seems indispensable while unit-testing.
They allow us to easily generate subs and mocks and assert that
certain interaction between components took place.

NOTE: If you do not remember difference between stub and mock,
please read [this Martin Fowler article](https://martinfowler.com/articles/mocksArentStubs.html). 
In short mocks are used to test interactions between components 
(a method was called, a property was set) 
while stubs are used as dumb implementations of component dependencies 
(they usually either do nothing or provide some preset data).

But recently, after reading volume 1 of 
[Elegant Objects](https://www.yegor256.com/elegant-objects.html)
which by the way I strongly recommend, I changed my mind.
In one of the chapters author presents the idea that every interface
should have an associated fake object. A fake object is a simple
but *working* implementation of an interface and resides in the same
source code file as the interface itself.
Fake objects serve two purposes. First, they are example implementations
of interfaces that show users how the interfaces should be implemented.
And second they can be used as stubs and mocks in unit-tests.

Of course this idea seemed a bit extreme to me, so I decided to go with
a bit more evolutionary approach.
I **slowly** replaced all mock object that I had in my unit-tests 
with fakes (I put all fakes in my unit test projects - but I am still thinking that maybe they deserve a project of thier own). 
During this process all interaction testing assertions 
that are usually performed using mocking frameworks
were replaced by behaviour testing assertions on fake objects.

It will be the best to ilustrate this process using an example.
Say we have a simple component `EventPublishingComponent` that
publishes two events (order is not important):
{% highlight csharp %}
public class EventPublishingComponent {
    private readonly EventPublisher _eventPublisher;
    public EventPublishingComponent(EventPublisher eventPublisher)
        => _eventPublisher = eventPublisher;

    public async Task Publish() {
        await _eventPublisher.Publish(new FirstEvent(id: 3));
        await _eventPublisher.Publish(
          new SecondEvent(id: "ZDKA9JOPCKXI7"));
    }
}

public class FirstEvent : Event {
    public int Id { get; }
    public FirstEvent(int id)
        => Id = id;
}

public class SecondEvent : Event {
    public string Id { get; }
    public SecondEvent(string id)
        => Id = id;
}

public interface EventPublisher {
    Task Publish(Event @event);
}

public interface Event { }
{% endhighlight %}
A "classic" unit test for this component using NSubstitute 
could look like this:
{% highlight csharp %}
public class EventPublishingComponentTest {
    private readonly EventPublisher _eventPublisher;
    private readonly EventPublishingComponent _component;

    public EventPublishingComponentTest() {
        _eventPublisher = Substitute.For<EventPublisher>();
        _component = new EventPublishingComponent(_eventPublisher);
    }

    [Fact]
    public async Task Should_publish_FirstEvent() {
        // Arrange
        FirstEvent firstEvent = null;
        await _eventPublisher
            .Publish(Arg.Do<FirstEvent>(e => firstEvent = e));

        // Act
        await _component.Publish();

        // Assert
        await _eventPublisher.Received(1)
            .Publish(Arg.Any<FirstEvent>());

        Check.That(firstEvent)
            .IsNotNull();

        Check.That(firstEvent.Id)
            .IsNotZero();
    }
}
{% endhighlight %}
I am sure you have seen a lot of tests like this. 
The key points are: Your create mocks and stubs using your
favourite mocking library in the test constructor or setup method.
In the arrange (given) part of the test you define mocks and stubs
behaviour using library specific syntax. Here e.g. we are capturing
argument passed to `Publish` method for later use:
{% highlight csharp %}
FirstEvent firstEvent = null;
await _eventPublisher
    .Publish(Arg.Do<FirstEvent>(e => firstEvent = e));
{% endhighlight %}
In the assert (then) part of the test we use again library specific
sytnax to check that a method on a mock 
was called with given set of arguments.

This approach is fine but it has some disadvantages:

1. It makes your tests very brittle. For example if I add a new method
 on `EventPublisher` called 
 `PublishAll(events)` that allows me to publish all events at once and
 refactor `EventPublishingComponent` to use it
 then `EventPublishingComponent` tests would stop working.
 The main problem here is that my tests check internal interaction
 between components 
 (was method `Publish` called?) instead of checking external behaviour 
 of the system (was event published?).

2. Mocking library is another tool that you must learn. 
 And please remember that most of the developers are not too eager to
 read documentation. Time presumably saved by using mocking libary 
 will be lost on reading stackoverflow answers and on fighting with
 the library itself 
 (ever have a problem that your stub does not return intended value?). 

3. It makes your tests less readable. I must admit that 
 NSubstitute is a huge improvement over Moq in terms
 of readablity but it still introduces a lot of visiual noise in the test
 code. For example see all those `<`, `>`, `(` and `)` in the code below:

{% highlight csharp %}
FirstEvent firstEvent = null;
await _eventPublisher
    .Publish(Arg.Do<FirstEvent>(e => firstEvent = e));
{% endhighlight %}

Now let us see how our test can look like if we use fakes:
{% highlight csharp %}
public class EventPublishingComponentTest_UsingFakes {
    private readonly InMemoryEventPublisher _eventPublisher;
    private readonly EventPublishingComponent _component;

    public EventPublishingComponentTest_UsingFakes() {
        _eventPublisher = new InMemoryEventPublisher();
        _component = new EventPublishingComponent(_eventPublisher);
    }

    [Fact]
    public async Task Should_publish_FirstEvent() {
        // Act
        await _component.Publish();

        // Assert
        var firstEvent = _eventPublisher.PublishedEvents
            .OfType<FirstEvent>()
            .SingleOrDefault();

        Check.That(firstEvent)
            .IsNotNull();

        Check.That(firstEvent.Id)
            .IsNotZero();
    }
}
{% endhighlight %}
To make this test compile we also need to write a fake for 
`EventPublisher` interface. Please keep in mind that fake is a simple
but **working** implementation of the interface:
{% highlight csharp %}
public class InMemoryEventPublisher : EventPublisher {
    private readonly List<Event> _publishedEvents 
      = new List<Event>();

    public IReadOnlyList<Event> PublishedEvents
        => _publishedEvents;

    public Task Publish(Event @event) {
        if (@event == null)
            throw new ArgumentNullException(nameof(@event));

        _publishedEvents.Add(@event);
        return Task.CompletedTask;
    }
}
{% endhighlight %}

I am sure that after seeing both versions of the test 
you agree with me that both are quite short and readable,
yet the second version does not have the earlier mentioned disadvantages.
Now you may rightly say that with the second approach 
you are forced to create fakes for
almost all interfaces in your application. You are right, but
you actually want to create fakes. Here is why:

1. Fakes are like TDD for your interface **design**. By creating a fake
 you actually check how difficult it is for a client 
 of your API to provide an implementation. A fake too big or 
 too difficult to
 implement is a sign that maybe your interface is doing too much.
 Also fakes can be treated as "reference implementations" of interfaces
 and as such they are part of your API documentation.

2. Writing a fake is a one-time effort. After fake is written it can
 be reused across many tests. Compare this with subs and mocks that you
 need to setup every time you want to use them.

Now it is time for a more real world example. 
As you probably heard *Performance is a feature* but logging can 
also be a feature. Imagine an application where we must log
every failed login attempt. Since this is a business requirement
we want to code it as an acceptance test.
How difficult it can be to check that one method call was
performed:
{% highlight csharp %}
logger.LogDebug("User '{userName}' log into application.", "root");
{% endhighlight %}
In practice it can be more difficult than it seems especially if you use
notoriously hard to test `ILogger` from `Microsoft.Extensions.Logging.Abstractions` package.

Why is `ILogger` hard to test? 

1. `ILogger` interface contains only three methods 
 ([source code here](https://github.com/aspnet/Logging/blob/master/src/Microsoft.Extensions.Logging.Abstractions/ILogger.cs))
 rest of its functionality is provided via extension methods.

2. Extension methods that operate on `ILogger` often 
 create wrappers around original 
 arguments using classes like `FormattedLogValues`.
 Most of these wrapper classes does not 
 overload `Equals` and `GetHashCode` rendering
 argument matchers from mocking frameworks useless.

3. No easy access to the logged message.
 Only method responsible for actual logging on `ILogger` interface
 is `Log`:

{% highlight csharp %}
void Log<TState>(
  LogLevel logLevel, 
  EventId eventId, 
  TState state, 
  Exception exception, 
  Func<TState, Exception, string> formatter);
{% endhighlight %}

To gain access to the logged message we must either dig 
into `state` argument
or call `formatter(state, exception)`.

All this causes that naive testing aproachs like this fail:
{% highlight csharp %}
[Fact]
public async Task Naive_test() {
  var logger = Substitute.For<ILogger<SomeClass>>();
      
  logger
    .LogDebug("User '{userName}' log into application.", "root");

  logger.Received()
    .LogDebug("User '{userName}' log into application.", "root");
}
{% endhighlight %}
And how they fail? With confusing error messages like this one:
{% highlight no-highlight %}
Error Message:
 NSubstitute.Exceptions.ReceivedCallsException : 
  Expected to receive a call matching:
  Log<Object>(Debug, 0, User 'root' log into application., <null>, Func<Object, Exception, String>)
Actually received no matching calls.
Received 1 non-matching call 
 (non-matching arguments indicated with '*' characters):
  Log<Object>(Debug, 0, *User 'root' log into application.*, <null>, Func<Object, Exception, String>)
{% endhighlight %}
Not very helpful, isn't it?

If you really want to test `ILogger` using NSubstitute you must
use the following code:
{% highlight csharp %}
var logger = Substitute.For<ILogger<SomeClass>>();

dynamic state = null;
Exception exception = null; 
Func<object, Exception, string> formatter = null;

logger.Log(LogLevel.Debug, 
  Arg.Any<EventId>(), 
  Arg.Do<object>(s => state = s), 
  Arg.Do<Exception>(ex => exception = ex), 
  Arg.Do<Func<object, Exception, string>>(f => formatter = f));

logger
  .LogDebug("User '{userName}' log into application.", "root");

logger.Received(1)
  .Log(LogLevel.Debug, 
      Arg.Any<EventId>(), 
      Arg.Any<object>(), 
      Arg.Any<Exception>(), 
      Arg.Any<Func<object, Exception, string>>());

Check.That(formatter(state, exception))
    .IsEqualIgnoringCase("User 'root' log into application.");
{% endhighlight %}
Did I say something earlier about unreadable tests and a lot of 
visual noise caused by mocking frameworks? Now you can see it with your
own eyes!

Now it is time for our second approach using fakes. First we create
a fake logger:
{% highlight csharp %}
public class InMemoryListOfEntriesLogger : ILogger {
    private readonly List<LogEntry> _loggedEntries 
      = new List<LogEntry>();

    private readonly Dictionary<string, int> _bookmarks 
      = new Dictionary<string, int>();

    public IReadOnlyList<LogEntry> LoggedEntries 
        => _loggedEntries;

    public IDisposable BeginScope<TState>(TState state) {
        // Notice that we do not have to implement
        // all methods for interfaces that are *not
        // part* of our application.
        throw new NotImplementedException();
    }

    public bool IsEnabled(LogLevel logLevel) {
        return true;
    }

    public void Log<TState>(
        LogLevel logLevel, 
        EventId eventId, 
        TState state, 
        Exception exception, 
        Func<TState, Exception, string> formatter) 
    {
        _loggedEntries.Add(
          new LogEntry(
            logLevel, 
            formatter(state, exception), 
            exception));
    }
}

public class LogEntry {
  public LogLevel LogLevel { get; }
  public string Message { get; }
  public Exception Exception { get; }

  public LogEntry(LogLevel logLevel, string message, 
    Exception ex = null) {
      LogLevel = logLevel;
      Message = message;
      Exception = ex;
  }

  public override string ToString()
      => $"{LogLevel}: {Message}" + 
         (Exception != null 
            ? $" Exception: {Exception.GetType().Name}" 
            : "") +
         ".";
}
{% endhighlight %}
Notice that we did not implement all methods of `ILogger` interface.
For external interfaces that are not under our control we should
implement just enough functionality in our fakes to make them usable.

Now it is time for writing actual test:
{% highlight csharp %}
var logger = new InMemoryListOfEntriesLogger();

logger.LogDebug("User '{userName}' log into application.", "root");

Check.That(logger.LoggedEntries)
    .HasElementThatMatches(x => 
        x.Message == "User 'root' log into application.");
{% endhighlight %}
Wow! Test is short, readable and simple. Exactly what I was looking for.

I hope that this blog post persuaded you to start using fakes in your
unit test. At least you now know that you have a good alternative to
mocking frameworks.

Sample source code (with a bit more complicated example): 
[GitHub](https://github.com/marcin-chwedczuk/blog-fakes-vs-mocks).

