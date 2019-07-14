---
author: mc
layout: post
cover: 'assets/images/cover8.jpg'
title: Using method references in Java 8
date:   2016-11-12 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Method references in Java 8 allows us to convert a call to a method
or a constructor into instance of functional interface.
For simple lambda expressions like `x -> x.foo()` using method
references results in expression `FooClass::foo` that is more
clear and readable (if this is your first encounter with method
references you may feel that they are more complicated than
lambdas - don't worry most people go through this stage,
after a while you get used to them and you will start to
appreciate their beauty).

We will start by demonstrating how to use method references
to call instance methods.
A lambda expression of form `(ObjClass obj) -> obj.method()` is
equivalent to method reference `ObjClass::method`, for example:
{% highlight java %}
class Person {
	private final String name;
	public Person(String name) {
		 this.name = name;
	}
	public String getName() {
		 return name;
	}
}

// Both functions do the same thing:
Function<Person, String> getNameLambda = person -> person.getName();
Function<Person, String> getNameMethRef = Person::getName;

// How to use it with stream:
Stream.of(new Person("Mike"), new Person("Maya"), new Person("Carl"))
	.map(person -> person.getName())
	.collect(toList());

Stream.of(new Person("Mike"), new Person("Maya"), new Person("Carl"))
	.map(Person::getName)
	.collect(toList());
{% endhighlight %}

Another kind of lambda expressions that can be changed to method references
has form `arg -> someObj.method(arg)`, here the instance on which method is
called is constant but the argument changes. Let's continue our example
with `Person`s:
{% highlight java %}
List<Person> linuxUsers = new ArrayList<>();

Consumer<Person> addUserLambda = person -> linuxUsers.add(person);
Consumer<Person> addUserMethRef = linuxUsers::add;

Stream.of(new Person("Mike"), new Person("Maya"), new Person("Carl"))
	.forEach(person -> linuxUsers.add(person));

Stream.of(new Person("Mike"), new Person("Maya"), new Person("Carl"))
	.forEach(linuxUsers::add)
{% endhighlight %}
This aproach also works with methods that have more than one parameter:
{% highlight java %}
class Person {
	private String name;
	public void setName(String firstName, String lastName) {
		 name = firstName + " " + lastName;
	}
}
Person anonymous = new Person();

BiConsumer<String, String> setNameMethRef = 
	(first, last) -> anonymous.setName(first, last);

BiConsumer<String, String> setNameMethRef = anonymous::setName;
{% endhighlight %}
When we provide both instance on which to call a method and all method
arguments we may use method references too:
{% highlight java %}
@FunctionalInterface
public interface TriConsumer<T1,T2,T3> {
    void apply(T1 arg1, T2 arg2, T3 arg3);
}

TriConsumer<Person, String, String> setNameOnPersonL = 
	(person, first, last) -> person.setName(first, last);

TriConsumer<Person, String, String> setNameOnPersonMR =
	Person::setName;
{% endhighlight %}

Using method references when working with static methods is also easy,
for example:
{% highlight java %}
IntBinaryOperator maxLambda = (a, b) -> Integer.max(a, b);
IntBinaryOperator maxMethRef = Integer::max;

DoubleSupplier randomLambda = () -> Math.random();
DoubleSupplier randomMethRef = Math::random;
{% endhighlight %}

Now let's move to constructor references.
Every lambda expression in form `() -> new FooClass()` can be
rewritten to use constructor reference as `FooClass::new`, for example:
{% highlight java %}
Supplier<ArrayList<Person>> createListLambda = () -> new ArrayList<>();
Supplier<ArrayList<Person>> createListMethRef = ArrayList::new;

// This also work when constructor has parameters:
class Person {
	public Person(String name) {
		 this.name = name;
	}
	...
}

Function<String, Person> createPersonWithNameL =
	name -> new Person(name);

Function<String, Person> createPersonWithNameMR =
	Person::new;
{% endhighlight %}
We may even use constructor references to create arrays:
{% highlight java %}
IntFunction<String[]> createArrayL = size -> new String[size];
IntFunction<String[]> createArrayMR = String[]::new;

// Unfortunately this doesn't work with 2D arrays
BiFunction<Integer, Integer, String[][]> createArray2DL = 
	 (rows, cols) -> new String[rows][cols]

// This will create SINGLE ARRAY of arrays not 2D array
// Each row of this array will be initially set to null
IntFunction<Integer, String[][]> notWork = String[][]::new;
{% endhighlight %}

The last example that I want to present illustrates how
to use method references to refer to super class methods:
{% highlight java %}
public abstract class SuperClass {
    void method() { 
        System.out.println("superclass method()");
    }
}

public class SubClass extends SuperClass {
    @Override
    void method() {
        Runnable superMethodL = () -> super.method();
        Runnable superMethodMR = SubClass.super::method;
    }
}
{% endhighlight %}

So after all this examples it's your turn now, launch your favorite IDE
and write some Java code with method references!

