---
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Java 8&#58 How to write custom collector
date:   2016-10-09 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post we will create custom collector that can be used
with Java 8 Stream API.

We will start by familiarising ourselves with the `Collector` interface:
{% highlight java %}
package java.util.stream;

public interface Collector<T,A,R> {
    Supplier<A> supplier();
    BiConsumer<A,T> accumulator();
    BinaryOperator<A> combiner();
    Function<A,R> finisher();
    Set<Characteristics> characteristics();
}
{% endhighlight %}
Before we move to explaining what each method should return, let's see how
they are used in a simplified version of `Stream::collect`:
{% highlight java %}
private static <T,A,R> R collect(
        Collector<T,A,R> collector, Iterable<T> elements) {

    Supplier<A> supplier = collector.supplier();
    A acc = supplier.get();

    BiConsumer<A,T> accumulator = collector.accumulator();
    for (T elem: elements) {
        accumulator.accept(acc, elem);
    }

    Function<A,R> finisher = collector.finisher();
    R result = finisher.apply(acc);

    return result;
}
{% endhighlight %}

After seeing it usage we may describe `Collector` interface in more detail.
Let's start with generic parameters used in declaration `Collector<T,A,R>`:

* `T` - type of stream elements
* `A` - type of a helper object that will be used to
 keep partial results of `collect` operation. I will call this 
 helper object an *accumulator object*
* `R` - type of `collect` operation result

Now we can move to describe methods required by `Collector` interface:

* `supplier()` - Method should return instance of `Supplier<A>` that will
 be used to create accumulator object(s). For parallel stream returned supplier may 
 be used to create many accumulator objects e.g. one per thread
* `accumulator()` - This is the most important method of the interface.
 It should return instance of `BiConsumer<A,T>` that will be
 used to incorporate current stream element into accumulator object.
 For example for `sum()` collector `BiConsumer` will be responsible for adding
 current number to the partial sum kept in the accumulator object
* `finisher()` - This method should return `Function<A,R>` that will transform
 accumulator object into final result
* `combiner()` - For parallel stream more than one accumulator object
 may be used in single `collect` operation.
 This method returns `BinaryOperator<A>` that can be used to "merge"
 two accumulator objects into one. For example for `sum()` collector 
 `BinaryOperator` should just add partial sums contained in accumulator objects
* `characteristics()` - This method should return `Set` of characteristics that
 describe current collector. The safe default is to return an empty set. Since
 this is an important topic we now move to describe it in more detail
 
Every collector can have any combination of the following characteristics:

* `Characteristics.CONCURRENT` - This means that _accumulator object_ returned
 by `suppier().get()` can be
 modified from many threads concurrently.
 Basically this flag means that during single `collect` operation parallel stream
 may use a single accumulator object and modify it
 from as many threads as it wants
 instead of creating many accumulator objects (one per thread) and then
 merging them via `combiner`
 
* `Characteristics.UNORDERED` - Specify this characteristics when result
 of the `collect` operation doesn't depend on the order of stream elements
 (or more mathematically when collector is comutative).
 For example `toSet()` collector has this characteristics
 because resulting `Set` doesn't depend on order of the stream elements.
 On the other hand `toList()`
 collector returns list that preserves order of elements in the original stream
 so it is ordered.  
 We must be careful when specifying this flag, for example
 at first you may say that `sum()` collector should be `UNORDERED`
 but when we take under account
 floating point overflow behaviour (+Infinity) it turns out
 that `sum()` must be ordered.  
 This characteristics is mostly useful when working with parallel streams.
 `UNORDERED` collector allows for more optimizations
 to be done during splitting
 stream into parts

* `Characteristics.IDENTITY_FINISH` - This characteristics means that `Function` returned
 by `finisher()` is identity and we may cast accumulator object straight to the result type

Now it's time to write some code! We will create simple `MinMaxCollector` that
will compute both min and max element of the stream at the same time:
{% highlight java %}
public class MinMaxCollector<T>
        implements Collector<T, 
                             MinMaxCollector.MinMaxAccumulator<T>,
                             MinMaxCollector.MinMax<T>> {
   
// here is our result type 
public static class MinMax<T> {
    private final Optional<T> min;
    private final Optional<T> max;

    public MinMax(T min, T max) {
        this.min = Optional.ofNullable(min);
        this.max = Optional.ofNullable(max);
    }

    ...
}

// here is our accumulator object
public static class MinMaxAccumulator<T> {
    private final Comparator<? super T> cmp;

    private T min = null;
    private T max = null;

    public MinMaxAccumulator(Comparator<? super T> cmp) {
        this.cmp = cmp;
    }

    public void accumulate(T elem) {
        min = (min == null || cmp.compare(elem, min) < 0) 
            ? elem : min;

        max = (max == null || cmp.compare(elem, max) > 0)
            ? elem : max;
    }

    public MinMaxAccumulator<T> combine(MinMaxAccumulator<T> other) {
        MinMax<T> otherMinMax = other.toMinMax();
        otherMinMax.getMax().ifPresent(this::accumulate);
        otherMinMax.getMin().ifPresent(this::accumulate);
        return this;
    }

    public MinMax<T> toMinMax() {
        return new MinMax<>(min, max);
    }
}

private final Comparator<? super T> cmp;

public MinMaxCollector(Comparator<? super T> cmp) {
    this.cmp = Objects.requireNonNull(cmp);
}

@Override
public Supplier<MinMaxAccumulator<T>> supplier() {
    return () -> new MinMaxAccumulator<>(cmp);
}

@Override
public BiConsumer<MinMaxAccumulator<T>, T> accumulator() {
    return MinMaxAccumulator::accumulate;
}

@Override
public BinaryOperator<MinMaxAccumulator<T>> combiner() {
    return MinMaxAccumulator::combine;
}

@Override
public Function<MinMaxAccumulator<T>, MinMax<T>> finisher() {
    return MinMaxAccumulator::toMinMax;
}

@Override
public Set<Characteristics> characteristics() {
    return Collections.emptySet();
}
}
{% endhighlight %}

Some remarks:

* In our example methods that were responsible for computing min/max were
 defined on accumulator object. Some people don't like this approach, instead
 they define all logic inside lambda expressions and use accumulator object
 to only keep data. For me this is just a mater of taste
* For simple collectors like `sum()` you don't need to define a new accumulator
 object class, `new long[1]` will do the job

Finally let's see how we may use our newly created collector:
{% highlight java %}
Stream<Box> boxes = Stream.of(
    new Box(1),
    new Box(3.2),
    new Box(0.4),
    new Box(4.1),
    new Box(0.11)
);

MinMaxCollector.MinMax<Box> boxMinMax = boxes
    .collect(new MinMaxCollector<>(comparing(Box::getWeight)));

System.out.println(boxMinMax);
// Output:
// MinMax{min=Optional[Box{weight=0.11}], 
//        max=Optional[Box{weight=4.1}]}
{% endhighlight %}

That's all, thanks for reading!
