---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Find cycle start in singly linked list
date:   2016-06-25 00:00:00
tags: algorithms
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will present solution to the following problem:

> We have a non empty singly linked list with a cycle in it.  
> We must find first
> element of a cycle in a linear time.

For example, given a singly linked list:
![List with cycle 1](assets/images/2016-06-25/llcycle1.svg)
Algorithm should return node `N3` as it is the first node counting
from head of a list that is part of cycle.

##### Boundary conditions

To better understand this problem let's think about boundary conditions for
our algorithm.

One of the boundary conditions is that entire list forms single cycle:
![Entire list forms cycle](assets/images/2016-06-25/llcycle2.svg)
In this case our algorithm should return first element of a list (`N1` node for a list
presented on picture above).

Another boundary condition is that only last element 
of the list forms a cycle:
![Only last element of the list forms a cycle](assets/images/2016-06-25/llcycle3.svg)
In this case algorithm should return last element of the list (`N4` node for
a list presented on picture above).

The last boundary condition is a list that consists of only one element:
![Single element list](assets/images/2016-06-25/llcycle4.svg)
In this case algorithm should return that single element.

For all except last described boundary conditions we should consider lists with odd and even number of elements.

##### Create test suite

Let's code these boundary conditions and a few of other generic cases as a set of unit tests.
To represent list nodes we will use following Java class:
{% highlight java %}
public class ListNode {
    public int value;
    public ListNode next;

    public ListNode(int value) { this(value, null); }

    public ListNode(int value, ListNode next) {
        this.value = value;
        this.next = next;
    }

    @Override
    public String toString() {
        return "ListNode{" +
                "value=" + value +
                '}';
    }
}
{% endhighlight %}
Our algorithm will be represented by `CycleStart.find` method:
{% highlight java %}
public final class CycleStart {
    private CycleStart() { }

    public static ListNode find(ListNode list) {
        // TODO: Implement algorithm
        return null;
    }
}
{% endhighlight %}
To avoid code duplication we will use JUnit 4 parameterized unit tests.
AssertJ will be used
as an assertion library:
{% highlight java %}
@RunWith(Parameterized.class)
public class CycleStartTest {

    @Parameterized.Parameters(name =
        "testcase {index}: CycleStart_find_works_with(listSize={0}, cycleSize={1})")
    public static Iterable<Object[]> data() {
        return Arrays.asList(new Object[][] {
        /* LIST_SIZE    CYCLE_SIZE */

        /* single element list */
        {  1,  1 },

        /* every element of list is part of cycle (odd and even list size cases) */
        { 10, 10 },
        {  9,  9 },

        /* only last element of list is part of cycle */
        { 10,  1 },
        {  9,  1 },

        /* random number of elements are part of cycle (with odd/even variants) */
        { 10,  5 },
        { 9,   5 },
        { 10,  6 },
        { 9,   6 },
        { 34, 11 }
        });
    }

    private final int listSize;
    private final int cycleSize;

    public CycleStartTest(int listSize, int cycleSize) {
        this.listSize = listSize;
        this.cycleSize = cycleSize;
    }

    @Test
    public void runTest() {
        ListWithCycle testData = ListWithCycle.having()
                .listSize(listSize)
                .cycleSize(cycleSize)
                .create();

        ListNode cycleStart = CycleStart.find(testData.list);

        assertThat(cycleStart)
                .isNotNull()
                .isEqualTo(testData.cycleStart);
    }
}
{% endhighlight %}
Each of arrays returned by static `data()` method contains
`CycleStartTest` constructor parameters. For each of these arrays JUnit will create
`CycleStartTest` instance with parameters passed to class constructor. Then
JUnit will call all methods annotated with `@Test` on that instance.
In our case we have two parameters `listSize` and `cycleSize`, I think these
are pretty self explanatory.

The last missing piece is `ListWithCycle` helper that creates list of given size
with cycle of given size:
{% highlight java %}
class ListWithCycle {
    public final ListNode list;
    public final ListNode cycleStart;

    private ListWithCycle(ListNode listHead, ListNode cycleStart) {
        this.list = listHead;
        this.cycleStart = cycleStart;
    }

    public static Builder having() {
        return new Builder();
    }

    public static class Builder {
        private int listSize;
        private int cycleSize;

        public Builder listSize(int listSize) {
            if (listSize < 0) throw new IllegalArgumentException("listSize must be >= 0");

            this.listSize = listSize;
            this.cycleSize = listSize;
            return this;
        }

        public Builder cycleSize(int cycleSize) {
            if (cycleSize <= 0) throw new IllegalArgumentException("cycleSize must be > 0");
            if (cycleSize > listSize) throw new IllegalArgumentException("cycleSize must be <= listSize");

            this.cycleSize = cycleSize;
            return this;
        }

        public ListWithCycle create() {
            List<ListNode> nodes = new ArrayList<>();
            ListNode prev = null;

            // create list
            for (int i = 0; i < listSize; i++) {
                ListNode curr = new ListNode(i);
                if (prev != null)
                    prev.next = curr;
                prev = curr;

                nodes.add(curr);
            }

            // create list cycle
            ListNode tail = prev;
            ListNode cycleStart = nodes.get(nodes.size() - cycleSize);
            tail.next = cycleStart;

            return new ListWithCycle(nodes.get(0), cycleStart);
        }
    }
}
{% endhighlight %}
Now with unit tests covering all normal and border cases we can
start implementing our algorithm.

##### Create simple implementation
Let's start with simple implementation that works in `O(N)` time but uses `O(N)`
additional memory. 
The idea behind this algorithm is simple. We will be tracking all
already visited nodes, when we visit some node N twice we will know that
node N must be start of a cycle.

This is implemented in Java as:
{% highlight java %}
public static ListNode find(ListNode list) {
    Map<ListNode, Object> visitedNodes =
                    new IdentityHashMap<ListNode, Object>();

    for (ListNode curr = list; curr != null; curr = curr.next) {
        if (visitedNodes.containsKey(curr)) {
            // curr was already visited so we visit it twice
            return curr;
        }
        else {
            // mark as visited
            visitedNodes.put(curr, null);
        }
    }

    return null;
}
{% endhighlight %}
We use `IdentityHashMap<K,V>` to track already visited nodes. 
`IdentityHashMap<K,V>` is special purpose `Map<K,V>` 
implementation that uses *references* to objects
as a keys. 
Internally it uses `==` instead of `Object.equals()` to compare keys for equality, and
`System.identityHashCode()` instead of `Object.hashCode()` to compute hashes.

This algorithm passes all unit tests but can't we do any better?  
In fact we can, there is a beautiful algorithm that runs in `O(N)` time and 
uses `O(1)` memory.

##### Create efficient implementation
Let's create a more efficient implementation.
To understand how it works we must first familiarize ourselves with fast and slow pointer
method. Main usage of fast and slow pointer method is cycle detection in singly
linked lists. The main idea is to have two pointers that traverse the same list. One pointer
"slow" moves only one element at time, other pointer "fast" moves two elements at time.
Singly linked list contains cycle if both pointers met. 
This can be implemented in Java as:
{% highlight java %}
boolean hasCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;
        
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        
        // fast caught up to slow, so there is a loop
        if(slow == fast)  
            return true;
    }
    
    // fast reached null, so the list terminates
    return false;  
}
{% endhighlight %}

In our algorithm we'll use simple fact from fast/slow pointer method: when
fast and slow pointers are inside cycle, fast pointer cannot "jump over" slow pointer.
In other words situation like:
![FAST pointer cannot jump over SLOW pointer](assets/images/2016-06-25/proof1.svg)
is not possible.

PROOF: First we assume that slow pointer always moves first and that
we stop algorithm when fast and slow pointer meet. (If entire list is one
cycle we would not count first step - when fast and slow pointers point to the list head).
Let's assume that fast pointer jumped over slow pointer as depicted on image above.
We know that slow pointer always moves first and it moves only one element at time,
so before slow pointer moved it was at `N2` node. But that was the node that
fast pointer was pointing to before it moved. In other words before slow and fast pointers
moved they pointed to the same node so our algorithm should have stopped, but it didn't.
Here we have contradiction that completes the proof.

Consequence of above proof is simple fact: let's say slow and fast pointers are pointing
at cycle first element and that cycle has C elements in total. After at most C slow pointer
moves, pointers must meed again. 

Now let's go back to our cycle start finding algorithm. 
To help us reason we will introduce some variables:

* N - number of nodes in list before cycle (`N = 3` in our example below)
* C - number of nodes in cycle (`C = 4` in our example below)
* K - position of slow pointer inside cycle 
 (first element of cycle has `k: 0`, second `k: 1` etc.)

Let's consider following situation, we ran fast/slow pointer algorithm on 7 element list
depicted below:
![SLOW pointer entering cycle](assets/images/2016-06-25/proof2.svg)
After N iterations of algorithm slow pointer enters
first element of the cycle and has position `K = 0`. Meanwhile fast
pointer that moves 2 times faster has position `Kfast = N % C`.
From this point every iteration of algorithm moves slow pointer from position `K` to `K+1`,
and fast pointer from position `Kfast` to `Kfast+2`. In other words after `S` iterations
of algorithm slow pointer has position `S % C` and fast pointer has position `(N+2*S) % C`.
We know that fast pointer cannot jump over slow pointer, both pointers must met 
in some `Smet` iteration (where `Smet <= C`). When this happens we have:

{% highlight no-highlight %}
Smet % C = (N + 2*Smet) % C
{% endhighlight %}
or in more mathematical notation:
{% highlight no-highlight %}
> Smet = N + 2*Smet (mod C)
{% endhighlight %}
We can transform this equation using modulo arithmetic into:
{% highlight no-highlight %}
0 = N + Smet (mod C)
{% endhighlight %}
and finally into:
{% highlight no-highlight %}
-Smet = N (mod C)
{% endhighlight %}
This last equation is very important, it tells us that after another `N` iterations of the
algorithm slow pointer will point at cycle first element:
{% highlight no-highlight %}
slow_pointer_pos_after_another_N_iterations = 
        Smet + N = Smet + (-Smet) = 0 (mod C)
{% endhighlight %}

From this we can get main idea of our new algorithm. First run fast/slow pointer algorithm
until pointers met. Then we know that after another N iterations slow pointer will point
at cycle first element. But hey if we start moving from list head after N iterations we will
point at first cycle element too! We don't know N but if we start moving slow pointer
one element at time and simultaneously we start moving another pointer from list head
one element at time they must met at cycle first element:
![Final algorithm illustrated](assets/images/2016-06-25/proof3.svg)

Above description of algorithm will work only when `C > 1` and `N > 1`. Case when `C = 1`
is simple and I leave it as an exercise to reader.
Case when `N = 0`: entire list forms a single cycle is easy too, we solve it now.
Slow and fast pointers will met after `Smet` iterations, then:
{% highlight no-highlight %}
slow_pos = Smet % C
fast_pos = Smet*2 % C

Smet = Smet*2 (mod C)
0 = Smet (mod C)
{% endhighlight %}
In other words because `Smet <= C` and `Smet = 0 (mod C)` 
pointers can met only at the first element of the cycle (at position 0 or C).
First element of the cycle is a list head, so in this case our algorithm will work too!

Now let's move to implementation:
{% highlight java %}
private static ListNode find(ListNode list) {
    ListNode slow = list;
    ListNode fast = list;

    // find meeting point
    do {
        slow = slow.next;
        fast = fast.next.next;
    }
    while (slow != fast);

    // find cycle start
    ListNode k = slow;
    ListNode head = list;

    while (k != head) {
        k = k.next;
        head = head.next;
    }

    return head;
}
{% endhighlight %}
All tests are green so we are done, yay!

##### References

* [How to detect loop in linked list](http://stackoverflow.com/questions/2663115/how-to-detect-a-loop-in-a-linked-list)
* [Fun with modulo arithmetic](https://betterexplained.com/articles/fun-with-modular-arithmetic/)

