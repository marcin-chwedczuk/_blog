---
author: mc
layout: post
cover: 'assets/images/cover7.jpg'
title: Creating and using annotations in Java
date:   2016-06-06 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
---

Java annotations are simple data that we can attach to program elements like
classes, fields or methods. True power of annotations lies in the fact that we
are able to retrieve this information at runtime. To demonstrate that we will create
simple annotation called `@RunAtStartup`. This annotation will allow programmers
to register classes that should be instantiated at program startup, programmers
will be able to specify class priority (via `priority` named element) and optionally
specify name of method that should be run on class instance (via `method` optional
element).

Here is example usage of `@RunAtStartup` annotation:
{% highlight java %}
// StartupClass1.java:
package mc.annotations;
import mc.annotations.RunAtStartup;

@RunAtStartup(priority = 10)
public class StartupClass1 {
    public void run() {
        System.out.println("Class 1 initialized!");
    }
}

// StartupClass2.java:
package mc.annotations;
import mc.annotations.RunAtStartup;

@RunAtStartup(priority = 100, method = "initialize")
public class StartupClass2 {
    public void run() {
        throw new IllegalStateException("This method should not be called");
    }

    public void initialize() {
        System.out.println("Class 2 initialized!");
    }
}
{% endhighlight %}

<!-- How to create annotations -->
annotations are declared using `@interface` keyword, here is declaration of our
`@RunAtStartup` annotation:
{% highlight java %}
package mc.annotations;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface RunAtStartup {
    int priority();
    String method() default "run";
}
{% endhighlight %}
annotation declaration is very similar to interface declaration, in fact annotations
are interfaces that are implemented by JVM behind the scene.


annotations can have zero or more elements (like `priority` or `method`), you can
provide default value for element via `default` keyword. If you provide default value
users won't be required to specify element value when applying annotation. Notice
that we are providing default value for `method` element, thus we don't need to provide it
in `StartupClass1` file, but still we are able to override default value 
as demonstrated in `StartupClass2` file. We always must provide value for elements
that doesn't have default value.

Elements of annotation must have one of types:

* `boolean`, `byte`, `short`, `int`, `long` (wrapper classes like `Integer` cannot be used)
* `String` type
* enum type
* class type
* another annotation type
* array of any of the above types

For example:
{% highlight java %}
public @interface TestAnnotation {
    Class<Comparable<?>> comparator();
    boolean ascendingSort();
    String sortName();
    String[] propertiesToSortBy();
}
{% endhighlight %}

There are two important standard annotations that help us create new annotations,
they are `@Target` and `@Retention`. `@Target` tells Java compiler on what program
elements annotation can be used, e.g. our `@RunAtStartup` annotation have 
`@Target(ElementType.Type)` target so it can be only used on classes and interfaces,
if we try to use it on field we get an error:
{% highlight java %}
@RunAtStartup(priority = 20)
private static int foo = 0;

// Error: java: annotation type not applicable to this kind of declaration
{% endhighlight %}
`@Retention` tells compiler and JVM if annotation should be accessible at runtime.
Some annotations exists only in Java source code, others exists
in `.class` files but cannot be accessed by reflection API, finally there are
annotations with retention `RetentionPolicy.RUNTIME` that can be accessed using 
reflection (our `@RunAtStartup` annotation is of that kind).

Finally there is a shortcut for creating annotations that have only single element,
if we name that element `value` we will be able to omit it name e.g.
{% highlight java %}
// SimpleAnnotation.java:
package mc.adnotations;

public @interface SimpleAnnotation {
    String value() default "ok";
}

// Usage:
@SimpleAnnotation("foo")
// instead of @SimpleAnnotation(value = "foo")
public class Main { ... }
{% endhighlight %}
This also works with arrays:
{% highlight java %}
// SimpleAnnotation.java:
package mc.adnotations;

public @interface SimpleAnnotation {
    String[] value() default { "ok" };
}

// Usage:
@SimpleAnnotation({ "foo", "bar" })
// instead of @SimpleAnnotation(value = { "foo", "bar" })
public class Main { ... }
{% endhighlight %}

TIP: For single element arrays we can write `@SimpleAnnotation("foo")` instead
of `@SimpleAnnotation({ "foo" })`.

Finally it's time to implement `@RunAtStartup` behaviour. Unfortunately there is no
simple way to get list of all classes in a package in Java. To keep our example simple
we assume that our program is loaded from directory (not from `jar` archive), in
that case list of classes in a package is simply a list of `.class` files in package
directory. To get class files we use Java 7 new file API:
{% highlight java %}
List<Class<?>> getAllClassesInPackageContaining(Class<?> clazz) 
    throws IOException 
{
    String clazzPackageName = clazz
            .getPackage()
            .getName();

    String clazzPath = clazz
            .getResource(".")
            .getPath();

    Path packagePath = Paths.get(clazzPath)
            .getParent();

    final List<Class<?>> packageClasses = new ArrayList<>();

    Files.walkFileTree(packagePath, new SimpleFileVisitor<Path>() {
        @Override
        public FileVisitResult visitFile(
                Path file, BasicFileAttributes attrs) 
                throws IOException 
        {
            String filename = 
                file.getName(file.getNameCount()-1).toString();

            if (filename.endsWith(".class")) {
                String className = filename.replace(".class", "");

                try {
                    Class<?> loadedClazz = Class.forName(
                        clazzPackageName + "." + className);
                        
                    packageClasses.add(loadedClazz);
                }
                catch(ClassNotFoundException e) {
                    System.err.println(
                        "class not found: " + e.getMessage());
                }
            }

            return super.visitFile(file, attrs);
        }
    });

    return packageClasses;
}
{% endhighlight %}
And our main program contained in `Main` class looks like this:
{% highlight java %}
private static class RunAtStartupData {
    Object object;
    Method method;
    int priority;

    public RunAtStartupData(
        Object object, Method method, int priority) 
    {
        this.object = object;
        this.method = method;
        this.priority = priority;
    }

    public void callMethod() throws Exception {
        method.invoke(object);
    }
}

public static void main(String[] args) throws Exception {
    List<Class<?>> packageClasses =
        getAllClassesInPackageContaining(Main.class);

    List<RunAtStartupData> registrations = new ArrayList<>();

    for (Class<?> clazz : packageClasses) {
        RunAtStartup runAtStartup = 
            clazz.getAnnotation(RunAtStartup.class);
        if (runAtStartup == null) continue;

        Object instance = clazz.newInstance();
        Method method = clazz.getMethod(runAtStartup.method());

        registrations.add(new RunAtStartupData(
            instance, method, runAtStartup.priority()));
    }

    Collections.sort(
        registrations,
        Comparator.<RunAtStartupData>comparingInt(x -> x.priority)
              .reversed());

    for (RunAtStartupData registration : registrations) {
        registration.callMethod();
    }
}
{% endhighlight %}
We use `clazz.getAnnotation(RunAtStartup.class)` to check if annotation was applied
to given class. Another tricky part is use of Java 8 lambda and new Comparator API
to sort all startup classes by their priorities (classes with higher priority should
run first).
