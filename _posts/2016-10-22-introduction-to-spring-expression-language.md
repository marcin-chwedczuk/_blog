---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Introduction to SpEL (Spring Expression Language)
date:   2016-10-22 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

When writing bean wiring configuration in Spring it happens
from time to time that we need something more than just primitive
values and references to other beans to setup our bean.
For example we may want to set bean property to value of some class static
field or maybe we need to initialize that property with result of some
method call. Of course we could use bean `init-method` and
initialize these properties from Java code but doing this from configuration
file would be more convenient and would keep our business logic separated
from configuration. Fortunately Spring allows us to use simple expressions
while wiring beans via SpEL - Spring Expression Language.

SpEL expression in configuration files must be put inside `#{ }` delimiters.  
As every self respecting language SpEL supports literals:
{% highlight xml %}
<bean id="spelDemo" class="SpELDemo">
  <property name="boolValue" value="#{true}" />
  <property name="intValue" value="#{22}" />
  <property name="doubleValue" value="#{1.23e4}" />
  <property name="stringValue" value="#{'foo'}" />
</bean>
<!-- this produces bean with values:
  boolValue=true, intValue=22, 
  doubleValue=12300.0, stringValue=foo -->
{% endhighlight %}
SpEL also supports simple arithmetic 
(`+`,`-`,`*`,`/`,`%` and `^` - exponentiation),
string concatenation (via `+`) and string interpolation:
{% highlight xml %}
<bean id="spelDemo" class="SpELDemo">
  <property name="intExpr" value="#{1+2+3}" />
  <property name="stringExpr" value="#{'foo'+'bar'}" />
  <property name="stringInterpolation" 
      value="[#{'foo'}: #{3*4}]" />
</bean>
<!-- this produces bean with values:
  intExpr=6, stringExpr=foobar,
  stringInterpolation=[foo: 12] -->
{% endhighlight %}
SpEL supports full range of boolean (`!`, `not`, `and`, `or`)
and comparison operators (`eq`, `ne`, `lt`, `le`, `gt`, `ge`).
We can refer to boolean negation using either `!` or `not`.
Comparison operators can be written using mnemonics e.g. `lt` or
symbols e.g. `<`, since in XML files we must escape `<` and `>` characters
it's better to stick to mnemonics.
Again example will be handy here:
{% highlight xml %}
<property name="bool1" value="#{4 lt 8}" />
<property name="bool2" value="#{true or false}" />
<property name="bool3" value="#{(3 gt 5) or not (5 gt 3)}" />
<property name="bool4" value="#{8 ne 8}" />

<!-- property values:
  bool1=true, bool2=true, 
  bool3=false, bool4=false -->
{% endhighlight %}

Now it's time to move to more advanced SpEL features,
let's start with method calls and reading JavaBeans properties:
{% highlight xml %}
<bean id="myJavaBean" class="MyJavaBean">
  <property name="myProperty" value="SpEL is awesome!" />
</bean>

<bean id="spelDemo" class="SpELDemo">
  <!-- when reading properties we may write obj.foo
        instead of obj.getFoo() -->
  <property name="stringExpr" value="#{myJavaBean.myProperty}" />

  <!-- method calls work just as in Java, we may also
        chain them e.g. 'foo'.substring(1).toUpperCase() -->
  <property name="boolExpr" value="#{'foo'.contains('o')}" />
</bean>

<!-- this produces bean with values:
  stringExpr=SpEL is awesome!, boolExpr=true -->
{% endhighlight %}
The last example showed important feature of SpEL - inside SpEL expressions
we may refer to other beans by their `id`.
This allows us to create complex wirings. For example let's say that
we have two `consumer`s and a single `producer` beans that must share
the same instance of `queue`. To complicate things `queue` is
a part of the `producer` bean (imagine that we use some complex legacy library
that we cannot change).
With SpEL we can produce such wiring with ease:
{% highlight xml %}
<bean id="producer" class="...">...</bean>

<bean id="consumer1" class="...">
  <property name="inQueue" value="#{producer.outQueue}" />
</bean>
<bean id="consumer2" class="...">
  <property name="inQueue" value="#{producer.outQueue}" />
</bean>
{% endhighlight %}
The other scenario when SpEL shines
is injection of beans created by factory method.
For example let's say we have `emailService` bean that takes
collection of `MessageFilter`s. All message filters
are created via `filterFactory` bean, and we want
to keep configuration of what filters to use in XML.
We can code such scenario using SpEL:
{% highlight xml %}
<bean id="filterFactory" class="FilterFactory"></bean>
<bean id="emailService" class="EmailService">
  <constructor-arg>
    <list>
      <value>#{filterFactory.createFilter("SPAM")}</value>
      <value>#{filterFactory.createFilter("ANTIVIRUS")}</value>
      <value>#{filterFactory.createFilter("SIZE")}</value>
    </list>
  </constructor-arg>
</bean>
{% endhighlight %}

As mentioned previously SpEL allows us to access static class
members using syntax `T(full.class.name).member`, for example:
{% highlight xml %}
<property name="doubleValue" 
  value="#{T(java.lang.Math).random()}" />

<property name="doubleValue2" 
  value="#{T(java.lang.Math).PI}" />
{% endhighlight %}

Sometimes when writing SpEL expressions we want to inject
different beans depending on some condition.
For example we may want to inject `TextMessageNotificationService`
only when text messages are enabled in configuration.
Fortunately for us SpEL supports good old `?:` ternary operator:
{% highlight xml %}
<bean id="configuration" class="Configuration"
  init-method="loadConfiguration">
  <!-- this bean loads configuration from database -->
</bean>

<bean id="textMessageNotificationService"
   class="TextMessageNotificationService" />
<bean id="emailNotificationService"
   class="EmailNotificationService" />
 
<bean id="orderingService" class="OrderingService">
   <property name="notificationService"
      value="#{configuration.useTextMessages ? 
         textMessageNotificationService : 
         emailNotificationService}" />
</bean>
{% endhighlight %}
SpEL also supports so known Elvis operator `?:`.
Writing `foo ?: bar` is equivalent to writing `(foo != null) ? foo : bar`,
in other words Elvis operator is mostly used to provide default values:
{% highlight xml %}
<property name="myProperty" 
  value="#{someBean.stringProperty ?: 'default'}" />
{% endhighlight %}

The last thing that I want to show is how to use SpEL
to get values from `.properties` file.
First we must load properties using Spring `util:properties` element
which will create instance of `java.util.Properties` class and
register it as a bean with `appProperties` name.
Then inside SpEL expression 
we may use `appProperties.propertyName` or `appProperties['propertyName']`
to get actual property value:
{% highlight xml %}
<util:properties id="appProperties"
    location="classpath:app.properties" />

<bean id="someBean" class="MyJavaBean">
   <property name="foo" value="#{appProperties.foo}" />
   <property name="bar" value="#{appProperties['bar']}" />
</bean>
{% endhighlight %}
{% highlight no-highlight %}
# app.properties
foo=1
bar=2
{% endhighlight %}

That's all for today! We only scratched the surface of what SpEL can do so
if you get interested don't forget to check [friendly Spring docs](http://docs.spring.io/spring/docs/current/spring-framework-reference/html/expressions.html).


