---
author: mc
layout: post
cover: 'assets/images/mc_cover9.jpeg'
title: Comparing with nullsFirst and nullsLast
date: 2017-01-14 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Sorting in Java is easy:
{% highlight java %}
public class Data {
    private final String value;
    public Data(String value) {
        this.value = value;
    }
 
    public String getValue() { return value; }
 
    @Override public String toString() {
        return String.format("Data(%s)", this.value);
    }
}
 
public static void main(String[] args) {
   List<Data> listOfData = Arrays.asList(
          new Data("foo"),
          new Data("bar"),
          new Data("nyu"));
 
   listOfData.sort(comparing(Data::getValue));
   listOfData.forEach(System.out::println);
}
//OUTPUT:
// Data(bar)
// Data(foo)
// Data(nyu)
{% endhighlight %}
...unless we try to sort a collection containing null values:
{% highlight java %}
List<Data> listOfData = Arrays.asList(
       new Data("foo"),
       null,
       new Data("bar"),
       new Data("nyu"));
 
listOfData.sort(comparing(Data::getValue));
listOfData.forEach(System.out::println);
//OUTPUT:
// Exception in thread "main" java.lang.NullPointerException
//    at java.util.Comparator.lambda$comparing$77a9974f$1(Comparator.java:469)
{% endhighlight %}
Fortunately there is easy solution to this problem. But first we must
decide whenever we want `null`s to be first or last in sorted collection.
After we made our mind we may use nifty `nullsFirst` or `nullsLast`
decorators provided by `Comparator` interface:
{% highlight java %}
import static java.util.Comparator.*;
 
List<Data> listOfData = Arrays.asList(
       new Data("foo"),
       null,
       new Data("bar"),
       new Data("nyu"));
 
listOfData.sort(nullsFirst(comparing(Data::getValue)));
listOfData.forEach(System.out::println);
//OUTPUT:
// null
// Data(bar)
// Data(foo)
// Data(nyu)
{% endhighlight %}
`nullsFirst` is great example of decorator design pattern
(it adds functionality but doesn't change interface).
`nullsFirst` works by wrapping provided comparator in code similar to:
{% highlight java %}
public static <T> Comparator<T> nullsFirst(Comparator<T> comparator) {
  return (a, b) -> {
    if (a == null)
        return (b == null) ? 0 : -1;
 
    if (b == null)
      return 1;
 
    // a and b are not null here
    return comparator.compare(a, b);
  };
}
{% endhighlight %}

Previous example works great unless we try to sort a collection
containing `Data(null)`:
{% highlight java %}
List<Data> listOfData = Arrays.asList(
       new Data("foo"),
       new Data(null),
       new Data("bar"),
       new Data("nyu"));

listOfData.sort(nullsFirst(comparing(Data::getValue)));
listOfData.forEach(System.out::println);
//OUTPUT:
// Exception in thread "main" java.lang.NullPointerException
//  at java.util.Comparator.lambda$comparing$77a9974f$1(Comparator.java:469)
//  at java.util.Comparators$NullComparator.compare(Comparators.java:83)
{% endhighlight %}
But do not despair `nullsFirst` can help us again:
{% highlight java %}
listOfData.sort(nullsFirst(
    comparing(Data::getValue, nullsFirst(naturalOrder()))));

listOfData.forEach(System.out::println);
//OUTPUT:
// Data(null)
// Data(bar)
// Data(foo)
// Data(nyu)
{% endhighlight %}
Ta da! It works but readability suffers greatly... You may ask what is
this thing:
{% highlight java %}
comparing(Data::getValue, nullsFirst(naturalOrder()))
{% endhighlight %}
First: we use the following overload of `comparing` method:
{% highlight java %}
public static <T, U> Comparator<T> comparing(
   Function<? super T, ? extends U> keyExtractor,
   Comparator<? super U>            keyComparator)
{
    return (c1, c2) -> keyComparator.compare(
          keyExtractor.apply(c1),
          keyExtractor.apply(c2));
}
{% endhighlight %}
Second: in our example `nullsFirst(naturalOrder())` is a comparator that can
compare nullable `String`s:
{% highlight java %}
Comparator<String> cmp = nullsFirst(naturalOrder());
cmp.compare("foo", "zzz"); // -1
cmp.compare("foo", null);  // 1
{% endhighlight %}

Now everything should be clear (I hope).

To sum up in this post we get to know two
little methods `nullsFirst` and `nullsLast`.
I admit that they are a bit unintuitive to use, but definitely worth
to bear in mind.

