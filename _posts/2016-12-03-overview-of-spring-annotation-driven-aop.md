---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Overview of Spring annotation driven AOP
date: 2016-12-03 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will show you how to use Spring aspects.
In contrast to AspectJ aspects that are implemented by either
compile time or load time bytecode manipulation (process often called waving),
Spring aspects are implemented using proxy classes.
The main advantage of proxy aspect implementation is ease of use,
the main disadvantage is reduced functionality of aspects
(e.g. we cannot intercept calls to static methods).

Diagram below illustrates how proxy classes are used to
add functionality contained in `Aspect I` and `Aspect II` to 
`MyComponentImpl` class:
![Proxy based aspects in Spring](assets/images/2016-12-03/proxy2.svg)
When application asks Spring for `MyComponent`
implementation Spring detects that there are aspects attached to
`MyComponentImpl` class,
so instead of returning `MyComponentImpl` instance
Spring creates and returns a proxy.
Proxy returned to client implements `MyComponent` interface
and by default redirects all method calls to `MyComponentImpl` instance.
In some situations like e.g. calling a `doStuff()` method
proxy may execute code (called advice) from `Aspect I` and/or `Aspect II`,
thus adding functionality to `MyComponentImpl` class.

#### Application setup

Before we create our first aspect we need to setup our application.
Let's start with Maven dependencies. We will need `spring-aspects`
and `aspectjweaver` libraries.
You may be wondering why we need something from AspectJ which we
don't use. Spring Framework supports not only proxy based aspects
but also full blown AspectJ aspects, to avoid code duplication
designers of Spring decided to borrow annotation definitions like `@Aspect` 
from AspectJ project.
Thus `aspectjweaver` is only used as an annotation library and nothing more.
{% highlight xml %}
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-core</artifactId>
  <version>4.3.3.RELEASE</version>
</dependency>
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-context</artifactId>
  <version>4.3.3.RELEASE</version>
</dependency>

<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-aspects</artifactId>
  <version>3.2.0.RELEASE</version>
</dependency>

<dependency>
  <groupId>org.aspectj</groupId>
  <artifactId>aspectjweaver</artifactId>
  <version>1.8.9</version>
</dependency>
{% endhighlight %}

Next we need to create Spring configuration class and bootstrap
Spring context:
{% highlight java %}
package io.mc.springaspects;
import org.springframework.context.annotation.ComponentScan;

@Configuration
@ComponentScan("io.mc.springaspects")
@EnableAspectJAutoProxy
public class SpringConfiguration { }
{% endhighlight %}
NOTE: To enable proxy based aspects we need to add `@EnableAspectJAutoProxy`
annotation to our configuration class.

{% highlight java %}
public static void main(String... args) throws Exception {
   AnnotationConfigApplicationContext appContext = 
      new AnnotationConfigApplicationContext(
         SpringConfiguration.class);
  // context ready to use!!!
  appContext.close();
} 
{% endhighlight %}

#### Creating aspects

Before we start let's introduce some terminology. Advice is 
a piece of code that should be executed when certain event
like calling a method takes place. A pointcut is a set of
events, for example all calls to a method `foo()` contained in
class `Bar`. A join point is a single event for example a
particular invocation of method `foo()`
on line 105 in class `Bar`.
Aspect is a pointcut-advice pair, in other words aspect defines
what should be done (advice) and when (pointcut).
Spring borrowed this terminology from AspectJ, it takes a while
to get used to it.

We will start by crating `@Before` and `@After` aspects that
as their names suggest are invoked before and after a method call.
Our aspects will add functionality to the following component:
{% highlight java %}
package io.mc.springaspects;

@Component
public class DummyComponent {
    private final ConsoleLogger consoleLogger;
    
    @Autowired
    public DummyComponent(ConsoleLogger consoleLogger) {
        this.consoleLogger = consoleLogger;
    }

    public void doStuff() {
        consoleLogger.log("DummyComponent::doStuff");
    }
}
{% endhighlight %}

Let's start with `@Before` aspect
(here I use the same name for aspect and advice, but remember that they
are two different things):
{% highlight java %}
@Aspect
@Component
@Order(100)
public class DummyAspect {
    private final ConsoleLogger consoleLogger;
    
    @Autowired
    public DummyAspect(ConsoleLogger consoleLogger) {
        this.consoleLogger = consoleLogger;
    }
    
    @Pointcut("execution(* io.mc.springaspects.DummyComponent.doStuff())")
    protected void doStuff() { }
    
    @Before("doStuff()")
    public void beforeDoStuff(JoinPoint joinPoint) {
      // ...
    }
}
{% endhighlight %}
A few things to notice:

* `DummyAspect` class will contain definitions of our aspects, we may define
 many aspects inside a single class
* `DummyAspect` must be registered as a Spring component 
 (here I used `@Component` annotation).
 This also means that dependency injection works inside aspects
* Class must be marked with `@Aspect` annotation otherwise Spring will ignore
 our aspects
* Optionally we may provide `@Order` annotation that specifies order of aspects
 (e.g. when there is more than one aspect attached to a given method call).
 The higher the order value the more close the aspect is to the original method
 call, see the diagram below:

![Aspects order](assets/images/2016-12-03/order.svg)

Now let's see how `@Before` aspects works.
A pointcut defines a set of events (like calling a method) to which we want to
attach advices.
For example to create a pointcut that will "point" to every invocation of 
`DummyComponent::doStuff` method, we may write:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.doStuff())")
protected void doStuff() { }
{% endhighlight %}
This code creates named pointcut with `doStuff` name.
Strange expressions passed to `@Pointcut` annotation is
borrowed from AspectJ, it tells Spring that we want to
select method calls `execution`, of methods that may return any
type `*`, and are members of `io.mc.springaspects.DummyComponent` class,
and are named `doStuff`, and doesn't take any parameters `()`.

Now let's move to the advice:
{% highlight java %}
@Before("doStuff()")
public void beforeDoStuff(JoinPoint joinPoint) {
     consoleLogger.log("BEFORE CALL TO doStuff()");
     
     consoleLogger.log("ARGUMENTS:");
     Arrays.stream(joinPoint.getArgs())
         .map(Object::toString)
         .forEach(arg -> consoleLogger.log("\t%s", arg));
     
     consoleLogger.log("");
}
{% endhighlight %}
Advice is implemented as an instance method, first we
declare that this is a `@Before` advice - so it will be called
before target method. We also define where we want to use
advice by passing pointcut name to `@Before` annotation.
Advice method may optionally have a `JoinPoint` argument that
represents particular invocation of `doStuff()` method.
`JoinPoint` contains many useful informations
like `doStuff()` method arguments, or value of `this` reference.

Let's check if our aspect works:
{% highlight java %}
DummyComponent dummyComponent = 
  appContext.getBean(DummyComponent.class);
dummyComponent.doStuff();
// Output:
// BEFORE CALL TO doStuff()
// ARGUMENTS:
// 
// TestComponent::doStuff
{% endhighlight %}
Yay! It is but since `doStuff` doesn't have any parameters we
can't test arguments logging. We will fix that now, by adding 
a single parameter of type `String` to `doStuff` method:
{% highlight java %}
// DummyComponent:
public void doStuff(String x) {
   consoleLogger.log("TestComponent::doStuff(x), x = %s", x);
}
{% endhighlight %}
Since we changed method signature we must also change our pointcut definition:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.doStuff(..))")
protected void doStuff() { }
{% endhighlight %}
We are using `..` to tell Spring that method may have any number of arguments.
We may also specify exact number and types of arguments for example:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.doStuff(String))")
protected void doStuff() { }
{% endhighlight %}
With changed pointcut we now get:
{% highlight java %}
DummyComponent dummyComponent = 
  appContext.getBean(DummyComponent.class);
dummyComponent.doStuff("foo");
// Output
// BEFORE CALL TO doStuff()
// ARGUMENTS:
//  foo
//
// TestComponent::doStuff(x), x = foo
{% endhighlight %}

##### Extracting arguments

Sometimes we want to extract method argument value, instead
of manually extracting argument from `JoinPoint` we may ask Spring
to do this for us.
Let's add another parameter to `doStuff`:
{% highlight java %}
public void doStuff(String x, String y) {
  consoleLogger.log("TestComponent::doStuff(x, y), " +
    "x = %s, y = %s", x, y);
}
{% endhighlight %}
Then let's define another aspect:
{% highlight java %}
@Pointcut("execution(void io.mc.springaspects.DummyComponent.doStuff(String,String))" +
  "&& args(arg1,arg2)")
protected void doStuff2(String arg1, String arg2) { }
    
@Before("doStuff2(arg1, arg2)")
public void beforeDoStuff2(String arg1, String arg2) {
  consoleLogger.log("arg1 = %s, arg2 = %s", arg1, arg2);
}
{% endhighlight %}
Here we use `args` expression to bound method arguments to `arg1` and `arg2`
variables. Then we may use `arg1` and `arg2` as a parameters in aspect method.
Don't forget to add parameters to pointcut name in `@Before` annotation otherwise
you will get nasty exception with strange and unhelpful message.

##### Modifying method parameters

Aspects allow us to easily change values of method arguments.
For example given method:
{% highlight java %}
public void greetUser(String userName) {
  consoleLogger.log("Hello, %s", userName);
}
{% endhighlight %}
We may create aspect `toUpperCase` that will uppercase user name
before passing argument to target method.
Unfortunately `@Before` aspect is not powerful enough to do this,
we will need `@Around` aspect:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.greetUser(String))")
protected void greetUser() { }

@Around("greetUser()")
public void toUpperCase(ProceedingJoinPoint joinPoint) throws Throwable {
  Object[] originalArguments = joinPoint.getArgs();
  
  Object[] newArguments = new Object[1];
  newArguments[0] = ((String)originalArguments[0]).toUpperCase();
  
  joinPoint.proceed(newArguments);
}
{% endhighlight %}
`@Around` advice has a single parameter of type `ProceedingJoinPoint` that
represents pending target method invocation. This is very powerful feature since
it allows us to change method parameters and return value, wrap
thrown exceptions or even skip method call altogether.
Here we simply invoke target method with changed arguments using `ProceedingJoinPoint::proceed` call.

##### Modifying return value

Aspects allow us to change return value of a method.
For example let's add method to our `DummyComponent` class:
{% highlight java %}
public Collection<Integer> getNumbers(int  size) {
   if (size == 0)
      return null;

   return IntStream.range(0, size)
      .mapToObj(Integer::valueOf)
      .collect(toList());
}
{% endhighlight %}
Notice that for `size` equal zero `getNumbers` returns `null`.
Returning null instead of empty collection 
isn't good programming practice let's change that
behaviour using aspects.

We will start with already familiar `@Around` advice:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.getNumbers(int))")
protected void getNumbers() { }

@Around("getNumbers()")
public Object aroundGetNumbers(ProceedingJoinPoint joinPoint) throws Throwable {
  Object result = joinPoint.proceed();
  
  return (result == null)
    ? Collections.emptyList()
    : result;
}
{% endhighlight %}
If `@Around` advice method returns value then that 
value will be used as return value
of the target method, this is exactly what we do here.

If we only want to access return value we may also use 
`@AfterReturning` advice:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.getNumbers(int))")
protected void getNumbers() { }

@AfterReturning(pointcut="getNumbers()", returning="result")
public void add111(Collection<Integer> result) {
  if (result != null)
    result.add(111);
}
{% endhighlight %}
Here we cannot change returned value itself but we may call methods on it,
set properties etc.

##### Intercepting exceptions

We may use `@Around` advice to intercept, handle or wrap exceptions thrown
by target method (just add ordinary `try..catch` statement around
`proceed` call). Here we will concentrate on `@AfterThrowing` advice
that allows us to inspect exceptions thrown by target method.

In `DummyComponent` we must add method:
{% highlight java %}
public void doThrow() {
  throw new TestException(
    "TestException from TestComponent::doThrow");
}
{% endhighlight %}
We must also declare our exception class:
{% highlight java %}
package io.mc.springaspects;

public class TestException extends RuntimeException {
    private static final long serialVersionUID = 
        -7335805942545920111L;

    public TestException(String message) {
        super(message);
    }
}
{% endhighlight %}
And pointcut-advice pair:
{% highlight java %}
@Pointcut("execution(* io.mc.springaspects.DummyComponent.doThrow())")
protected void doThrow() { }

@AfterThrowing(pointcut="doThrow()", throwing="ex")
public void doThrowThrows(TestException ex) {
   consoleLogger.log("doThrow() THROWS EXCEPTION: %s",
        ex.getClass().getSimpleName());
}
{% endhighlight %}

##### Aspects and interface methods

So far we only attached advices to concrete classes like `DummyComponent`,
in real applications we often want to attach advices to all implementations
of given interface.
Fortunately for us Spring supports this scenario.
We will start by declaring `DummyInterface` interface 
and its two implementations:
{% highlight java %}
package io.mc.springaspects;

public interface DummyInterface {
    void dummyMethod();
}
{% endhighlight %}
{% highlight java %}
@Component("implA")
public class DummyInterfaceImplA implements DummyInterface {
    private final ConsoleLogger logger;
    @Autowired
    public DummyInterfaceImplA(ConsoleLogger logger) {
        this.logger = logger;
    }
    @Override
    public void dummyMethod() {
        logger.log("DummyInterface Implementation A");
    }
}
{% endhighlight %}
{% highlight java %}
@Component("implB")
public class DummyInterfaceImplB implements DummyInterface {
    ...
}
{% endhighlight %}

Now we may attach our advice to `DummyInterface::dummyMethod`:
{% highlight java %}
@Pointcut("execution(void io.mc.springaspects.DummyInterface+.dummyMethod())")
protected void dummyMethod() { }

@Before("dummyMethod()")
public void beforeDummyMethod(JoinPoint joinPoint) {
  String implementation =
          joinPoint.getTarget().getClass().getSimpleName();
  
  logger.log("Interface method called from class: %s", implementation);
}
{% endhighlight %}
In pointcut expression I used `DummyInterface+` to select
all classes that implement `DummyInterface`.
In pointcut expression we are not limited to a single method, we may use
`DummyInterface+.*(..)` expression to attach advice to all interface methods.

Let's check if our advice works:
{% highlight java %}
DummyInterface dummyInterface = 
    (DummyInterface) appContext.getBean("implB");
dummyInterface.dummyMethod();
// Output:
// Interface method called from class: DummyInterfaceImplB
// DummyInterface Implementation B
{% endhighlight %}

##### Aspects and annotations

Another common scenario in real life apps is to attach advices to
methods marked with given annotation.
Let's start by creating custom annotation:
{% highlight java %}
@Target(METHOD)
@Retention(RUNTIME)
public @interface UseAdviceOnThisMethod {
    String value() default "";
}
{% endhighlight %}
Then we must create test method in `DummyComponent` and mark it with
`@UseAdviceOnThisMethod` annotation:
{% highlight java %}
@UseAdviceOnThisMethod
public void someMethod() {
   consoleLogger.log("Hello, world!");
}
{% endhighlight %}
And finally we must create pointcut-advice pair:
{% highlight java %}
@Pointcut("execution(@io.mc.springaspects.UseAdviceOnThisMethod * *.*(..))")
protected void useAdviceOnThisMethodAnnotation() { }    

@Before("useAdviceOnThisMethodAnnotation()")
public void useAdviceBefore(JoinPoint joinPoint) {
  consoleLogger.log("[ASPECT] SOURCE LOCATION: %s",
      joinPoint.getSourceLocation());
}
{% endhighlight %}
In pointcut expression we use `* *.*(..)` to signify that we want
to consider methods with any return type, within any class, with any
name and taking any number and types of arguments.
But we also use `@io.mc.springaspects.UseAdviceOnThisMethod` expression
to point only to these methods that are annotated with `@UseAdviceOnThisMethod`.

Often in advice we want to access annotation to read some values from it.
To access annotation we may modify our `@Before` advice to:
{% highlight java %}
@Pointcut("execution(@io.mc.springaspects.UseAdviceOnThisMethod * *.*(..))")
protected void useAdviceOnThisMethodAnnotation() { }    

@Before("useAdviceOnThisMethodAnnotation() && @annotation(useAdvice)")
public void useAdviceBefore(JoinPoint joinPoint, 
                            UseAdviceOnThisMethod useAdvice) {
  consoleLogger.log("VALUE: %s", useAdvice.value());
}
{% endhighlight %}

##### Aspects and proxy unwrapping

Since Spring aspects are implemented using proxy classes we may
skip advice invocation by unwrapping Spring bean:
{% highlight java %}
DummyComponent dummyComponent = appContext.getBean(DummyComponent.class);
// advice called
dummyComponent.someMethod();
// unwrap target component - don't do this
// in real apps
dummyComponent = (DummyComponent) 
    ((Advised)dummyComponent).getTargetSource().getTarget();
// advice NOT called
dummyComponent.someMethod();
{% endhighlight %}

##### The End

We only scratched the surface of what Spring aspects can do,
and we only used basic expressions in pointcut definitions.
Aspect oriented programming is a huge topic and requires time
and practice to master. I hope that this blog post helped you to
understand what apects are and how to use them in Spring.
If you have any remarks how I can improve this post please leave a comment.

[DOWNLOAD SOURCE CODE](assets/data/2016-12-03/spring-aspects.zip)


