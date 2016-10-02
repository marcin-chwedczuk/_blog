---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Grouping using Java 8 streams
date:   2016-10-02 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post we will learn how to perform grouping using new Java 8 Stream API.
We will be working with the following list of students:
{% highlight java %}
public enum Country { POLAND, UK, GERMANY }
        
public class Student {
    private final String name;
    private final int age;
    private final Country country;
    private final int score;
        
    ...
}
        
List<Student> students = Arrays.asList(
    /*          NAME       AGE COUNTRY          SCORE */
    new Student("Jan",     13, Country.POLAND,  92),
    new Student("Anna",    15, Country.POLAND,  95),
    new Student("Helga",   14, Country.GERMANY, 93),
    new Student("Leon",    14, Country.GERMANY, 97),
    new Student("Michael", 14, Country.UK,      90),
    new Student("Tim",     15, Country.UK,      91),
    new Student("George",  14, Country.UK,      98)
);
{% endhighlight %}

Let's start by grouping students by country, this is fairly simple:
{% highlight java %}
import static java.util.stream.Collectors.*;

Map<Country, List<Student>> studentsByCountry =
        students.stream()
                .collect(groupingBy(Student::getCountry));

System.out.println(studentsByCountry);
// Output:
// {UK=[Michael/14/UK/90, Tim/15/UK/91, George/14/UK/98],
//  POLAND=[Jan/13/POLAND/92, Anna/15/POLAND/95],
//  GERMANY=[Helga/14/GERMANY/93, Leon/14/GERMANY/97]}
{% endhighlight %}
All we needed to do was to use `groupingBy` collector from `Collectors` class.
`groupingBy` collector takes single parameter called `classifier` that assigns grouping key 
to every stream element.
In our example we used method reference `Student::getCountry`
(which is equivalent to lambda expression `student -> student.getCountry()`) to
tell `groupingBy` that we want to group students by country
(in other words country was our grouping key).

By default elements with the same key are gathered into `List<T>`,
we may change this behaviour by specifying second parameter to `groupingBy`,
for example:
{% highlight java %}
// Use Set's as "buckets"
Map<Country, Set<Student>> studentsByCountry =
    students.stream()
            .collect(groupingBy(Student::getCountry, toSet()));

// Use ArrayList's as "buckets"
Map<Country, ArrayList<Student>> studentsByCountry =
     students.stream()
             .collect(groupingBy(Student::getCountry, 
                                 toCollection(ArrayList::new)));
{% endhighlight %}
Here again we used method reference `ArrayList::new` which is a shorter way
to write `() -> new ArrayList()`.

Now you may start wondering how it works, actually `groupingBy` can
take any collector as a second argument. Diagram below illustrates how
the call to `groupingBy(classifier, collector)` is executed:
![How groupingBy works](assets/images/2016-10-02/groupingBy2.svg){:style="width:400px;"}
As you can see on the diagram, `groupingBy` first
divides stream elements into groups according to values returned by `classifier`, then
it uses `collector` to get the final value for each group.

With our new `groupingBy` knowledge we may start writing more
interesting groupings.
For example let's count number of students per country,
code below does the job:
{% highlight java %}
Map<Country, Long> numberOfStudentsByCountry =
    students.stream()
            .collect(groupingBy(Student::getCountry, counting()));

System.out.println(numberOfStudentsByCountry);
// Output:
// { UK=3, POLAND=2, GERMANY=2 }
{% endhighlight %}
It works thanks to standard `counting()` collector that just counts number of elements
passed to it.

And what about average student score per country? No problem with that:
{% highlight java %}
Map<Country, Double> avgScoreByCountry =
    students.stream()
            .collect(groupingBy(Student::getCountry,
                                averagingInt(Student::getScore)));

System.out.println(avgScoreByCountry);
// Output:
// { UK=93.0, POLAND=93.5, GERMANY=95.0 }
{% endhighlight %}
Thanks to `averagingInt()` collector that - you guess it - computes average of
`int`s passed to it (notice that it returns `Double`).

One more example before we move forward, let's compute max student age per country:
{% highlight java %}
Map<Country, Optional<Integer>> maxAgeByCountry =
    students.stream()
            .collect(groupingBy(Student::getCountry,
                                mapping(Student::getAge,
                                        maxBy(Integer::compare))));

System.out.println(maxAgeByCountry);
// Output:
// { UK=Optional[15], POLAND=Optional[15], GERMANY=Optional[14] }
{% endhighlight %}
Here we do something more complex, we use `mapping(mapper, downstream)`
collector that transforms every element passed to it using `mapper` function
and then passes that transformed element to `downstream` collector.
So what we do here is that we first group students by country, then in every
group we map every student to his/her age and we pass that age to `maxBy()` collector
that finally computes max age in every group.

That was something but what about this `Optional<Integer>`s in the results?
`maxBy()` collector returns `Optional<T>` to signify that sometimes it
cannot compute maximum e.g. it happens when we use `maxBy()` on empty stream.
We may fix problem with optionals if we map `maxBy()` result via `Optional::get` 
`collectingAndThen()` collector does exactly that:
{% highlight java %}
Map<Country, Integer> maxAgeByCountry =
students.stream()
    .collect(groupingBy(Student::getCountry,
                        mapping(Student::getAge,
                            collectingAndThen(maxBy(Integer::compare),
                                              Optional::get))));

System.out.println(maxAgeByCountry);
// Output:
// { UK=15, POLAND=15, GERMANY=14 }
{% endhighlight %}

Since we may pass any collector as a second argument to `groupingBy`,
we may pass another `groupingBy` collector - this way we may group
stream elements by more than one criteria.
For example let's group students by country and age:
{% highlight java %}
Map<Country, Map<Integer, List<Student>>> studentsByCountryByAge =
    students.stream()
            .collect(groupingBy(Student::getCountry,
                                groupingBy(Student::getAge)));

System.out.println(studentsByCountryByAge);
// Output:
// { UK={ 14=[Michael/14/UK/90,George/14/UK/98],  15=[Tim/15/UK/91] }, 
// POLAND={ 13=[Jan/13/POLAND/92],  15=[Anna/15/POLAND/95] }, 
// GERMANY={ 14=[Helga/14/GERMANY/93,Leon/14/GERMANY/97] } }
{% endhighlight %}

That's all for today, now go and write some code!

