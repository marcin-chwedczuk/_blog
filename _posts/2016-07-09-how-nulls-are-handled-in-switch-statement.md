---
layout: post
cover: 'assets/images/mc_cover1.jpg'
title: How null's are handled in switch statement in C#, Java and JavaScript
date:   2016-07-09 00:00:00
tags: csharp java javascript
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Let's start with C#. In C# `null`s may show up in `switch` statement in two cases:

1. We `switch` on `string` type
2. We `switch` on nullable `char`, nullable integral type (`byte`, `short` etc.) 
 or nullable enum

Both cases are handled by compiler in the same way,
we just declare `case null` label and it will work out of the box.

This is illustrated by simple program:
{% highlight csharp %}
using System;

public class Program
{
   public void Main() {
        int? n = GetDefault<int?>();
 
        // This will write null       
        switch(n) {
            case null: Console.WriteLine("null");    break;
            case 1:    Console.WriteLine("value 1"); break;
            default:   Console.WriteLine("default"); break;
        }


        string s = GetDefault<string>();
 
        // This will write null       
        switch(s) {
            case null:   Console.WriteLine("null");    break;
            case "foo":  Console.WriteLine("foo");     break;
            default:     Console.WriteLine("default"); break;
        }
    }
    
    // GetDefault returns null for nullable and reference type T
    private T GetDefault<T>() {
        return default(T);   
    }
}
{% endhighlight %}

##### Java switch and null's

In Java `null`'s may show up in `switch` statement when we `switch` 
on primitive type wrappers like `Integer` or on `String` or on enum type.
In that case Java will throw `NullPointerException` as is demonstrated by program:
{% highlight java %}
public class Program 
{
  public static void main(String[] args)
  {
    String s = getNullString();
    try {
      switch(s) {
          // case null - doesn't compile:
          // error: constant string expression required
          // case null:  System.out.println("null"); break;

          case "foo": System.out.println("foo"); break;
          default:    System.out.println("default"); break;
      }
    }
    catch(NullPointerException ex) {
        // exception stack trace points to `switch(s) {` line
        System.out.println("null pointer exception");
    }
    
    FooEnum e = getNullFooEnum();
    try {
      switch(e) {
       // case null doesn't compile
       // error: an enum switch case label must be the unqualified name of an enumeration constant
       // case null: System.out.println("null"); break;
        
       case OPTION_1: System.out.println("option 1"); break;
       default:       System.out.println("default");  break;
      }
    }
    catch(NullPointerException ex) {
        // exception stack trace points to `switch(e) {` line
        System.out.println("null pointer exception");
    }
  }
  private static String getNullString() {
        return null; 
  }
  private static FooEnum getNullFooEnum() {
    return null;
  }
}

enum FooEnum {
  OPTION_1,
  OPTION_2
}
{% endhighlight %}
Program output:
{% highlight no-highlight %}
null pointer exception
null pointer exception
{% endhighlight %}
As we have seen it's not even possible to declare `case null` label.

In Java until you are 100% sure that value will not contain `null` you must
explicitly check for `null` before switch as in:
{% highlight java %}
FooEnum e = getNullFooEnum();

if (e == null) { 
  System.out.println("null"); 
}
else {
  switch(e) {
    case OPTION_1: System.out.println("option 1"); break;
    default:       System.out.println("default");  break;
  }
}
{% endhighlight %}
Or use trick with default value:
{% highlight java %}
Integer n = getNullableInteger();

// -1 is default here, but you may use Integer.MIN/MAX_VALUE or any
// other value
switch((e != null) ? e : -1) {
  case 1:  System.out.println("1"); break;
  case -1: System.out.println("null"); break;
  default: System.out.println("default"); break;
}
{% endhighlight %}

WARNING: This Java behaviour may cause problems when we translate code from C# to Java.

#### JavaScript switch and null

JavaScript `switch` statement is very flexible, each `case` label may contain
an expression that will be evaluated at runtime. To compare `case` label values to
`switch` value JavaScript uses `===` operator.

In JavaScript there is no problem with using `null` and even `undefined` as `case`
labels. Only tricky thing is with `NaN`s because `NaN === NaN` yields `false`
in JavaScript. This is enforced by IEEE 754 standard that describes floating point
numbers representation and behaviour. 
In other words we can use `NaN` as a `case` label but
program will never enter block of code associated with that label. As a side note
it's worth to mention that in JavaScript `NaN` is 
the only value for which expression `x === x` yields
`false`.

Following program demonstrates flexibility of JavaScript `switch` statement:
{% highlight js %}
var values = [undefined, null, '', 0, NaN, 1, 'foo', {}];

values.forEach(function(value) {
    switch (value) {
        case undefined:
            console.log('undefined');
            break;

         case null:
            console.log('null');
            break;
        
        case '':
            console.log('empty string');
            break;
        
        case 0:
            console.log('zero');
            break;
        
        case NaN:
            // dead code here
            console.log('nan');
            break;
        
        case 1:
            console.log(1);
            break;
        
        // label with runtime expression here:
        case 'f'+'oo':
            console.log('foo');
            break;
        
        default:
            console.log('default');
            break;
    }
});
{% endhighlight %}
This program will write:
{% highlight no-highlight %}
"undefined"
"null"
"empty string"
"zero"
"default"
1
"foo"
"default"
{% endhighlight %}
Notice that `"default"` was printed for `NaN` value.

That's all for today, I hope you learned something new from this article.   
May the Force be with you.

