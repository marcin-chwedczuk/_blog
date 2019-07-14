---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Notes on Spring XML configuration
date:   2016-10-16 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---
This post is below my usual quality standards, it's just
bunch of notes that I made while reading "Spring in Action".
Still I publish it mostly for myself but I hope someone may
find it helpful too.

#### Registering and using beans via Spring

Let's start with simple `StdOutNotificationService` bean:
{% highlight java %}
package beandemo;

public interface NotificationService {
    void showNotification(String message);
}

public class StdOutNotificationService implements NotificationService {
    @Override
    public void showNotification(String message) {
        System.out.println("NOTIFICATION: " + message);
    }
}
{% endhighlight %}
To register it with Spring we must add the following configuration 
file as a resource to our application:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">

   <bean id="notificationService" 
      class="beandemo.StdOutNotificationService" />

</beans>
{% endhighlight %}
NOTE: The `id` attribute of `bean` element is optional - we can refer to beans 
either by their name or their type.

Now we may create `ApplicationContext` from our configuration file
and finally use our beans:
{% highlight java %}
public static void main(String[] args) {
   ApplicationContext context =
      new ClassPathXmlApplicationContext(new String[] {
        "beandemo/bean-config.xml"
         // other configuration files
      });

   NotificationService notificationService =
      context.getBean(NotificationService.class);
   // or: context.getBean("notificationService")
   
   notificationService.showNotification("Yay! It works!");
}
{% endhighlight %}

#### Injection using constructor

Let's start with a simple example `ConstructorDemo` bean requires two
other beans (`NotificationService` and `SystemUserNameProvider`) to work:
{% highlight java %}
public class ConstructorDemo {
    private final NotificationService notificationService;
    private final SystemUserNameProvider systemUserNameProvider;
    
    public ConstructorDemo(
            NotificationService notificationService, 
            SystemUserNameProvider systemUserNameProvider) {
        super();
        this.notificationService = notificationService;
        this.systemUserNameProvider = systemUserNameProvider;
    }

    // ...   
}
{% endhighlight %}
In this case we should use Spring `constructor-arg` element to
tell Spring how it should resolve constructor arguments:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="...">
   <bean id="notificationService" class="beandemo.StdOutNotificationService" />
   <bean id="systemUserNameProvider" class="beandemo.JdkSystemUserNameProvider" />

   <bean id="constructorDemo" class="beandemo.ConstructorDemo">
      <constructor-arg ref="notificationService" />
      <constructor-arg ref="systemUserNameProvider" />
   </bean>
</beans>
{% endhighlight %}
We must provide all constructor arguments
otherwise Spring will throw `UnsatisfiedDependencyException`.

The order of `constructor-arg` elements is not important because
arguments are matched by type. 
In these rare cases when ambiguity arise we may use `name` and `index` attributes
of `constructor-arg` element to specify to which parameter dependency should 
be bound, for example:
{% highlight xml %}
<bean id="someBean" class="beandemo.SomeBean">
   <constructor-arg ref="dependency1" name="parameter1" />
   <constructor-arg ref="dependency2" name="parameter2"  />
</bean>
{% endhighlight %}

When providing constructor arguments we are not limited to
references to other beans, we may also provide standard Java types like
`String`. For example given bean:
{% highlight java %}
public class ValueBean {
    public ValueBean(String stringValue, Integer intValue, Boolean boolValue) {
        super();
        this.stringValue = stringValue;
        this.intValue = intValue;
        this.boolValue = boolValue;
    }
}
{% endhighlight %}
We may register it as follows (Spring will take care of converting strings
to apropriate types):
{% highlight xml %}
<bean id="prefixSuffix" class="beandemo.ValueBean">
   <constructor-arg value="some string" />
   <constructor-arg value="123" />
   <constructor-arg value="false" />
</bean>
{% endhighlight %}

Sometimes we want to set some constructor arguments to `null`,
we may use `<null />` element to do exactly that:
{% highlight xml %}
<bean class="...">
   <constructor-arg>
      <null />
   </constructor-arg>
   <constructor-arg ref="fooService" />
</bean>
{% endhighlight %}

#### Injection using setters

The most popular industry convention is that all required bean dependencies should
be injected via constructor and optional dependencies via setters.

Let's see how it works on example: `FooService` bean
requires `BarService` and has optional dependency on `BazService`.
This means that even without `BazService` `FooService` will work but
some features will not be accessible.
{% highlight java %}
public class FooService {
    private final BarService barService;
    private BazService bazService;
    
    public FooService(BarService barService) {
        super();
        this.barService = barService;
    }

    public void setBazService(BazService bazService) {
        this.bazService = bazService;
    }
    
    public void foo() {
        barService.bar();
        
        if (bazService != null)
            bazService.baz();
    }
}
{% endhighlight %}
And here is configuration for our example:
{% highlight xml %}
<beans xmlns="...">
   <bean id="fooService" class="beandemo.FooService">
      <constructor-arg ref="barService" />
      <!-- here we provide optional dependency -->
      <property name="bazService" ref="bazService" />
   </bean>
   
   <bean id="barService" class="beandemo.BarService" />
   <bean id="bazService" class="beandemo.BazService" />
</beans>
{% endhighlight %}

Property injection can also be used to populate JavaBeans,
for example given bean:
{% highlight java %}
public class Configuration {
    private String outputFile;
    private String inputFile;
    private Boolean enableLogging;
 
    public String getOutputFile() {
        return outputFile;
    }
    public void setOutputFile(String outputFile) {
        this.outputFile = outputFile;
    }

    // ...
}
{% endhighlight %}
{% highlight xml %}
<bean id="configuration" class="beandemo.Configuration">
   <property name="enableLogging" value="false" />
   <property name="inputFile" value="input.txt" />
   <property name="outputFile" value="output.txt" />
</bean>
{% endhighlight %}

As with `constructor-arg` we use `ref` attribute to refer to other beans and
`value` attribute to provide inline value. We can set property value to `null`
by writing:
{% highlight xml %}
<property name="propertyName">
   <null />
</property>
{% endhighlight %}

Since writing `property` may be tiring (at least in case of JavaBeans) there
is a shortcut, first we must add XML `p` namespace to configuration file:
{% highlight xml %}
<beans xmlns="http://www.springframework.org/schema/beans"
   xmlns:p="http://www.springframework.org/schema/p"
   ...
{% endhighlight %}
Then we may use `p:<propertyName>=value` syntax in configuration:
{% highlight xml %}
<bean id="configuration" class="beandemo.Configuration"
   p:inputFile="input.txt"
   p:outputFile="output.txt"
   p:enableLogging="true">
</bean>
{% endhighlight %}
There is also short cut for `<property name="" ref="" />`, just add `-ref` to
the end of property name e.g. `p:bazService-ref="baz"`.

#### Injecting collections

Sometime we want to inject not single beans but collections of beans, for
example given bean:
{% highlight java %}
public class MessageFilterService {
    private final List<MessageFilter> filters;

    public MessageFilterService(List<MessageFilter> filters) {
        this.filters = filters;
    }
    
    public List<Message> getGoodMessages(List<Message> messages) {
        return messages.stream()
            .filter(msg -> filters.stream()
                        .allMatch(filter -> filter.allow(msg)))
            .collect(toList());
    }
}

public interface MessageFilter {
    boolean allow(Message message);
}
{% endhighlight %}
To wire list of selected `MessageFilter`s into `MessageFilterService` 
we must use `list` element:
{% highlight xml %}
<bean id="messageSizeMessageFilter"
    class="beandemo.MessageSizeMessageFilter" />
    
<bean id="stopSpanMessageFilter"
    class="beandemo.StopSpamMessageFilter" />
    
<bean id="messageFilterService"
    class="beandemo.MessageFilterService">
    <constructor-arg>
        <list>
            <ref bean="messageSizeMessageFilter" />
            <ref bean="stopSpanMessageFilter" />
        </list>
    </constructor-arg>  
</bean>
{% endhighlight %}

To wire list of values we may write:
{% highlight xml %}
<bean id="listOfValues" class="beandemo.ListOfValues">
    <constructor-arg>
        <list>
            <value>foo</value>
            <value>bar</value>
            <value>nyu</value>
        </list>
    </constructor-arg>
</bean>
{% endhighlight %}

When injecting collections we are not limited to `list`,
we may also inject `set`, `map` and
`props` (instance of `java.util.Properties`):
{% highlight xml %}
<constructor-arg name="set">
    <set>
        <value>foo</value>
        <value>bar</value>
        <value>nyu</value>
        <ref bean="beanId" />
    </set>
</constructor-arg>
<constructor-arg name="map">
    <map>
        <entry key="foo" value="bar" />
        <entry key="baz" value-ref="beanId" />
        <entry key-ref="beanId" value="42" />
    </map>
</constructor-arg>
<constructor-arg name="props">
    <props>
        <prop key="foo">foo is great</prop>
        <prop key="bar">bar is great too</prop>
    </props>
</constructor-arg>
{% endhighlight %}

#### Miscellaneous

##### Bean lifetime
By default Spring tread are registered beans as singletons, to change
lifetime of bean use `scope` attribute:
{% highlight xml %}
<bean id="..." class="..." scope="prototype" />
{% endhighlight %}
Two most useful Spring scopes in console applications are

* `singleton` - only single instance of bean will exists per `ApplicationContext`
* `prototype` - create new bean instance per usage (if we inject bean three times
 we will get three instances)

Springs also supports `request` and `session` scopes, they are
mainly used in Spring MVC/Spring Boot applications.

##### Inline beans
Sometimes we want to create bean just to inject it in one place,
instead of writing:
{% highlight xml %}
<bean id="barUtil" class="BarUtil" />
<bean id="foo">
  <constructor-arg ref="barUtil" />
</bean>
{% endhighlight %}
We may write:
{% highlight xml %}
<bean id="foo">
  <constructor-arg>
    <bean class="BarUtil" />
  </constructor-arg>
</bean>
{% endhighlight %}

##### Init and Destroy events
Sometimes we want Spring to call initialization method after bean
instance is created, and likewise to call bean cleanup method just
before `ApplicationContext` is destroyed.
To specify such methods we may use `bean` element
`init-method` and `destroy-method` attributes:
{% highlight xml %}
<bean id="foo" class="beandemo.FooService" 
   init-method="init"
   destroy-method="destroy">
 <constructor-arg ref="bar" />
 <property name="bazService" ref="baz" />
</bean>
{% endhighlight %}
And a bean:
{% highlight java %}
public class FooService {
    public void init() { ... }
    public void destroy() { ... }
    ...
}
{% endhighlight %}

##### Creating beans using factory method

Given singleton implementation:
{% highlight java %}
public enum MySingleton {
    INSTANCE;
    
    public void doStuff() {
        System.out.println("Singletons are good!");
    }
    
    // factory method just for Spring:
    public static MySingleton getInstance() {
        return MySingleton.INSTANCE;
    }
}
{% endhighlight %}
We may register it in Spring as a bean using configuration:
{% highlight xml %}
<bean id="mySingleton"
    class="beandemo.MySingleton"
    factory-method="getInstance" /> 
{% endhighlight %}
Here we are just telling Spring to create `mySingleton` bean
by invoking method `getInstance()` on `MySingleton` class.
