---
layout: post
cover: 'assets/images/cover7.jpg'
title: Break out of block of code in Java and JavaScript
date:   2016-06-04 00:00:00
tags: javascript java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
---

Java and JavaScript have a common feature that allows us to break out of
nested loops, e.g. in Java we may write:
{% highlight java %}
OUTER_LOOP: for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        System.out.printf("%d x %d = %d%n", i, j, i * j);
        if (j == 1) break OUTER_LOOP;
    }
}
{% endhighlight %}
As you can see first we label outer for loop with `OUTER_LOOP` label, then we use
`break label_name` syntax to tell compiler which loop we want to break.

Likewise in JavaScript we may write:
{% highlight js %}
OUTER_LOOP: for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
        console.log([i, 'x', j, '=', i*j].join(' '));
        if (j == 1) break OUTER_LOOP;
    }
}
{% endhighlight %}
both programs will print:
```
0 x 0 = 0
0 x 1 = 0
```

TIP: You can use `continue` instead of `break` and it will work too.

I think most of you knew this already, but what's more interesting is that you can break
out of any nested code block, for example in Java:
{% highlight java %}
public static void func(boolean useBreak) {
    System.out.println("before outer");
    OUTER: {
        System.out.println("before break");

        // condition needed to prevend unreachable statement error
        if (useBreak)
            break OUTER;

        System.out.println("after break");
    }
    System.out.println("after outer");
}

public static void main(String[] args) {
    func(true);
}
{% endhighlight %}
this program will print when run:
```
before outer
before break
after outer
```

And similarly in JavaScript you can write:
{% highlight js %}
console.log('before outer');
OUTER: {
    console.log('before break');
    break OUTER;
    console.log('after break');
}
console.log('after outer');
{% endhighlight %}

Ability to break nested loops and to jump out of nested code blocks is not
something that you do on everyday job, but once in a year it may become handy.

Just remember to not overuse it: ![xkcd goto](//imgs.xkcd.com/comics/goto.png)
