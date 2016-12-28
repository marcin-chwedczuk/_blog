---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Generics in Java
date: 2016-12-27 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Generics were introduced with Java 6 and quickly
become indispensable tool of every Java programmer.
In this blog post I gathered the most important
facts about generics in Java. After reading this post you
you should be able to comfortable use generics in
your code.

#### Generic classes

We can declare generic `Pair` class using syntax:
{% highlight java %}
public class Pair<E1,E2> {
    private final E1 first;
    private final E2 second;

    public Pair(E1 first, E2 second) {
        this.first = first;
        this.second = second;
    }

    public E1 getFirst()  { return first;  }
    public E2 getSecond() { return second; }
}
{% endhighlight %}
Then we can use `Pair` as follows:
{% highlight java %}
// java 6:
Pair<String,Integer> p1 = new Pair<String,Integer>("foo", 10);
  
String first = p1.getFirst();
int second = p1.getSecond();
  
// java 7+ - using diamond operator <>
Pair<String,Integer> p2 = new Pair<>("foo", 10);
{% endhighlight %}
In Java 7 and later we can let compiler infer values of generic parameters
in `new` expression by using diamond operator (`<>`).

##### Bounds

We can reduce possible values of generic parameters by using bounds.
For example to reduce values of parameter `T` to types that
implement `Serializable` interface we can write:
{% highlight java %}
public class SerializableList<T extends Serializable> { }
{% endhighlight %}
When using bounds we are not limited to single type.
For example we may
require that types allowed for `T` must extend `MyBaseClass` and
implement `Serializable` and `Cloneable` interfaces:
{% highlight java %}
public class SerializableList2<
   T extends MyBaseClass & Serializable & Cloneable> { }
{% endhighlight %}
When we try to use `SerializableList` with types that doesn't
conform to our bounds we will get compile-time error:
{% highlight java %}
// ok
SerializableList<Integer> ints = new SerializableList<>();

// error: type argument java.lang.Object is not within bounds of type-variable T
SerializableList<Object> objs = new SerializableList<Object>();
{% endhighlight %}

##### Type erasure

In Java generics are implemented via type erasure, this means that
generics exists only in Java source code and not in JVM bytecode.
When Java compiler translates generic classes to bytecode it
substitutes generic parameters in class body with `Object`
or if generic parameter has bounds with value of the first bound.
For example our `Pair` class would be translated by compiler into:
{% highlight java %}
public class Pair {
    private final Object first;
    private final Object second;

    public Pair(Object first, Object second) {
        this.first = first;
        this.second = second;
    }

    public Object getFirst()  { return first;  }
    public Object getSecond() { return second; }
}
{% endhighlight %}
Compiler also inserts necessary casts, and converts between primitives 
and wrappers (e.g. between `int` and `Integer`) - a process
called (un)boxing. Continuing our example:
{% highlight java %}
pair = new Pair<String,Integer>("foo", 10);

String first = pair.getFirst();
int second = pair.getSecond();
{% endhighlight %}
is translated by compiler into:
{% highlight java %}
pair = new Pair("foo", 10);

String first = (String)pair.getFirst();
int second = ((Integer)pair.getSecond()).intValue();
{% endhighlight %}

Generics were implemented via type erasure to preserve binary
compatibility with pre Java 6 code (binary compatibility means that
your old code will work with generic types out of the box - you
don't need to change or recompile your legacy libraries).

##### Shortcomings of type erasure

Type erasure is not the best way to implement generics, and IMHO Java
should take a different approach (e.g. reification).
But Java didn't and we are stuck with "type erasure" generics.
Below is a list of Java generics shortcomings:

* Primitive types like `int` cannot be used with generics.
 We may use generics with wrapper types e.g. `Integer` but this
 will incur performance penalty caused by casts and boxing/unboxing operations.
* We cannot use generic parameters in declarations of static class
 members. Static class members are shared between all instances of generic
 class regardless of generic parameters values. To stress this fact
 Java allows to access static members only via class name without
 generic parameters:

{% highlight java %}
class Example<T> {
    // error: non-static type variable T cannot be referenced from a static context
    // private static T last;

    private static int counter = 0;
    public static void printCounter() {
        System.out.println("counter: " + counter);
    }

    public Example() { counter++; }
}

new Example<Integer>();
new Example<String>();

// error: not a statement
// Example<Integer>.printCounter();

// prints counter: 2
Example.printCounter();
{% endhighlight %}

* Sometimes Java compiler must create synthetic methods
 (in this case called bridge methods) to make overriding
 work with generic types. For example:

{% highlight java %}
interface TestInterface<T> {
    void consume(T value);
}

class TestClass implements TestInterface<Integer> {
    @Override
    public void consume(Integer value) {
        System.out.println(value);
    }
}
{% endhighlight %}
after type erasure becomes:
{% highlight java %}
interface TestInterface {
	void consume(Object value);
}

class TestClass implements TestInterface {
    public void consume(Integer value) {
        System.out.println(value);
    }
}
{% endhighlight %}
and we can see that `TestClass` no longer overrides
`consume` method from `TestInterface`. To solve this
problem compiler adds following method to `TestClass`:
{% highlight java %}
class TestClass implements TestInterface {
   // bridge method added by compiler:
   @Override public void consume(Object value) {
	 this.consume((Integer)value);
   }

   public void consume(Integer value) { ... }
}
{% endhighlight %}

* Generics don't work well with overloading, for example following
 overloads are forbidden:

{% highlight java %}
public void check(List<Integer> ints) { }
public void check(List<String> strings) { }
{% endhighlight %}
because after type erasure both methods have exactly the same signature
{% highlight java %}
public void check(List list) { }
{% endhighlight %}

Similarly we cannot implement the same interface twice
with different generic parameters. Again type erasure is our culprit:
{% highlight java %}
public interface Test<T> { }
// error: Test cannot be inherited with 
//	  different arguments: <Integer> and <String>
public class TestImpl 
	implements Test<Integer>, Test<String> { }
{% endhighlight %}

##### Raw types and unchecked warnings

To maintain backward compatibility Java allows us to use generic types
without specifying generic parameters. Such types are called raw types,
for example:
{% highlight java %}
// preferred usage of generics:
List<Integer> typedList = new ArrayList<Integer>();

// raw type:
List rawList = new ArrayList<Object>();
rawList.add("foo"); // unchecked warning
{% endhighlight %}
Raw types can be treated like generic types after type erasure.
Raw types should only be used to interact with legacy code.

When working with raw types compiler may generate an unchecked warning:
{% highlight nohighlight %}
warning: unchecked call to add(E) as a member of the raw type java.util.List
{% endhighlight %}
This warning means that compiler is not sure if we used generic type
correctly and in case that we didn't we should expect `ClassCastException`
at runtime. For example:
{% highlight java %}
public static void main(String[] args) {
  List<Integer> ints = new ArrayList<Integer>();

  List rawList = ints;
  legacyCode(rawList);

  int x = ints.get(0); // ClassCastException
}

public static void legacyCode(List list) {
  list.add("foo"); // unchecked warning
}
{% endhighlight %}
The problem here is that the client of `legacyCode` expected that `legacyCode`
will add integer to provided list. A simple solution is to use
`List<Object>` instead of `List<Integer>`
if `legacyCode` may add different types to list.
Notice also that line which generated unchecked warning didn't throw
any exception, exception was thrown later when the
client wanted to access list element.

We may suppress unchecked warning at the method or class level by using
`@SuppressWarnings("unchecked")` annotation.

#### Generic methods

We can declare generic method as follows:
{% highlight java %}
public static <E1,E2> Pair<E1,E2> pair(E1 first, E2 second) {
   return new Pair<E1,E2>(first, second);
}
{% endhighlight %}

Generic methods are invoked like ordinary methods:
{% highlight java %}
Pair<String,Integer> p1 = pair("foo", 10);
{% endhighlight %}
In most cases compiler will be able to infer proper values of
generic parameters. When it won't we can override compiler by
explicitly specifying generic parameters values:
{% highlight java %}
ClassName.<String,Number>staticMethod(arg1, arg2);
// or
this.<String,Integer>instanceMethod(arg1, arg2);

// syntax error:
// <String,Integer>method(arg1, arg2);
{% endhighlight %}

#### Wildcards

Let's consider method that copies elements from one list to
another:
{% highlight java %}
public static <T> void copy(List<T> dest, List<T> src) {
   for (T element: src) {
	  dest.add(element);
   }
}
{% endhighlight %}
It works perfectly with lists of integers:
{% highlight java %}
List<Integer> src = Arrays.asList(1,2,3);
List<Integer> dest = new ArrayList<>();
copy(dest, src);
{% endhighlight %}
But fails when we want to copy integers to list of numbers:
{% highlight java %}
List<Integer> src = Arrays.asList(1,2,3);
List<Number> nums = new ArrayList<>();
// error: method cannot be applied to given types
copy(nums, src);
{% endhighlight %}
We may fix method by adding second generic parameter:
{% highlight java %}
public static <D,S extends D>
void copy(List<D> dest, List<S> src) {
   for (S element: src) {
	  dest.add(element);
   }
}
{% endhighlight %}
This is so common situation that Java introduces a shortcut:
{% highlight java %}
public static <T> void copy(List<T> dest, List<? extends T> src) {
  for (T element: src) {
	  dest.add(element);
  }
}
{% endhighlight %}
Type `List<? extends T>` means that this is a list of elements that
extends or implements type `T`.

Wildcards allows us to reduce number of required generic parameters and
made method declarations more clear, for example:
{% highlight java %}
public static <T> boolean isNullOrEmpty(Collection<T> coll) {
  return coll == null || coll.isEmpty();
}

public static boolean isNullOrEmptyWildcards(Collection<?> coll) {
  return coll == null || coll.isEmpty();
}
{% endhighlight %}
Here `Collections<?>` means collection of elements of some certain type 
e.g. this may be
`Collection<Object>` or `Collection<MyClass>`.

##### super bound

`super` bound may be used only with wildcards.
`super` bound restricts values of wildcard to given class
and all of its superclasses, for example method:
{% highlight java %}
void process(List<? super Integer> list) { }
{% endhighlight %}
can only be used with `List<Integer>`, `List<Number>` and `List<Object>`.
Calling method with `List<String>` results in compile time error.

While `extends` bound is useful when we want to get values
from generic type instance,
`super` bound is needed when we want to pass values to generic type instance.
For example:
{% highlight java %}
static <T> void produceConsume(
	  Producer<? extends T> producer,
	  Consumer<? super T> consumer)
{
  for(;;) {
	  T value = producer.produce();
	  consumer.consume(value);
  }
}
{% endhighlight %}
Here `Producer` may produce type `T` or more derived type, and `Consumer`
may consume type `T` or more general type e.g. `Object`. Thanks to
wildcards we may use `produceConsume` with `Producer<Integer>` and
`Consumer<Object>`.

NOTE: Java compiler tries to infer the most specific type for
generic parameters. In call to `produceConsume` with `Producer<Integer>`
and `Consumer<Object>` `Integer` will be used as `T` parameter value.

##### Wildcard capture

Let's say that we want to create a method that swaps elements of
the list, we may write:
{% highlight java %}
public static void swap(List<?> list, int i1, int i2) {
   // doesn't compile
   ? tmp = list.get(i1);
   list.set(i1, list.get(i2));
   list.set(i2, tmp);
}
{% endhighlight %}
Unfortunately above code doesn't compile. We may either
introduce generic parameter to method signature or create
a helper method with generic parameter that 
will "capture" wildcard value:
{% highlight java %}
public static void swap(List<?> list, int i1, int i2) {
   swapImpl(list, i1, i2);
}
private static <T> void swapImpl(List<T> list, int i1, int i2) {
   T tmp = list.get(i1);
   list.set(i1, list.get(i2));
   list.set(i2, tmp);
}
{% endhighlight %}

Introducing generic parameter is always better solution than
using wildcard capture. I only mention above technique because
it is often used in Java Collection Framework.

#### Covariance and contravariance

With Java arrays we may write:
{% highlight java %}
String[] strings = { "foo", "bar" };
Object[] objects = strings;
{% endhighlight %}
We say that Java arrays are covariant.

Generics in Java are invariant this means that below
code doesn't compile:
{% highlight java %}
List<String> strings = Arrays.asList("foo", "bar");
// error: incompatible types
List<Object> objects = strings;
{% endhighlight %}
We must tread `List<String>` and `List<Object>` as two
distinct types.

Still we may use wildcards to refer to either
`List<String>` or `List<Object>`:
{% highlight java %}
List<String> strings = Arrays.asList("foo", "bar");
List<Object> objects = Arrays.asList(true, 1, "foo");

List<?> list = strings;
list = objects;
{% endhighlight %}
`List<?>` should be treated as superclass of any `List<T>`,
because it represents list of objects of some certain type.

We can't do much with `List<?>`, we can only get `Objects` from it,
add `null`s and ask for size (operations allowed for any list):
{% highlight java %}
List<?> list = strings;

list.add(null);
Object value = list.get(0);
list.size();
{% endhighlight %}
Operations on `List<?>` are limited because we don't know what types list contains.
We may limit range of possible types with bounds thus gaining
more functionality:
{% highlight java %}
List<? extends Number> numbers = Arrays.asList(1.2, 3.5);
Number num = numbers.get(0);
{% endhighlight %}
Now compiler knows that list elements are at least numbers so
we may assign result of `get()` to variable of type `Number`.
Still we are not able to put anything beyond `null` into list,
because we don't know if this is a list of doubles or a list of integers.

When we want to add elements to list we should use `super` bound:
{% highlight java %}
List<? super Number> numbers =
   new ArrayList<Object>(Arrays.asList("foo", true));

numbers.add(3);
numbers.add(3.2);
{% endhighlight %}
Now compiler knows that list holds numbers or elements more general
than numbers e.g. objects, so adding number to list is safe.

#### How to use generic types with `instanceof` and `class` 

Because of type erasure types `List<Object>` and `List<Integer>` are
indistinguishable to JVM. To check if value is instance of `List` we
may write:
{% highlight java %}
Object value = new ArrayList<Integer>();

if (value instanceof List<?>) {
   // do something
}
{% endhighlight %}
Similarly types `List<Object>` and `List<Integer>` are represented
by the same class token:
{% highlight java %}
List<Integer> integers = new ArrayList<Integer>();
List<Object> objects = new ArrayList<Object>();

Class<? extends List> integersClazz = integers.getClass();
Class<? extends List> objectsClazz = objects.getClass();
Class<ArrayList> arrayListClazz = ArrayList.class;

// true
System.out.println(integersClazz.equals(objectsClazz));
// true
System.out.println(integersClazz.equals(arrayListClazz));
{% endhighlight %}
Notice that in instance test we should use type with wildcard (`List<?>`) but to
get class token we should use raw type (`ArrayList.class`).

#### Generics and arrays

Let's consider this innocent looking code:
{% highlight java %}
public static <T> T[] toArray(T v1) {
  T[] array = (T[]) new Object[1]; // unchecked warning
  array[0] = v1;
  return array;
}
{% endhighlight %}
Calling this method results in `ClassCastException`:
{% highlight java %}
String[] s = toArray("foo"); // class cast exception
{% endhighlight %}
Because we cannot assign `Object[]` instance to `String[]` variable.
The source of the trouble is type erasure again.
Because value of parameter `T` is not accessible at runtime
we don't know what array we should create - should it be array of
objects or maybe array of strings. We may fix this method by passing
additional parameter that will represent required type of array elements:
{% highlight java %}
public static <T> T[] toArray(T v1, Class<T> type) {
  T[] array = (T[]) Array.newInstance(type, 1);
  array[0] = v1;
  return array;
}

String[] s = toArray("foo", String.class);
{% endhighlight %}
Now method works as expected but is cumbersome to use.

Another problem with arrays and generics is that we cannot
create array with generic elements - type erasure is culprit again:
{% highlight java %}
// error: generic array creation
// List<Integer>[] lists = new List<Integer>[3];

List<Integer>[] lists = (List<Integer>[]) new List[3];
{% endhighlight %}
To create array of generic types we must use raw type and cast.

To sum up: you should avoid mixing arrays and generics.

#### Generics and varargs

Java varargs methods are implemented using arrays, when we try
to use varargs with generics:
{% highlight java %}
public static <T> List<T> concat(List<? extends T>... lists) {
   List<T> concatenated = new ArrayList<T>();

   for (List<? extends T> l: lists) {
	  concatenated.addAll(l);
   }

   return concatenated;
}
{% endhighlight %}
compiler issues a warning:
{% highlight nohighlight %}
warning: unchecked generic array creation for varargs parameter
{% endhighlight %}
Generic varargs suffer from the same problems as generic arrays.
If we are sure that our code is safe,
we may use `@SafeVarargs` annotation to suppress this warning.

#### Additional resources

If you want to know more about generics check resources below:

* [Java Generics and Collections: Speed Up the Java Development Process](http://a.co/5oMY1hY)
* [Java Generics FAQ](http://www.angelikalanger.com/GenericsFAQ/JavaGenericsFAQ.html)


