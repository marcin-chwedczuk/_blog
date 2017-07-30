---
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: Hibernate HHH000179 warning&#58 Narrowing proxy to class this operation breaks ==
date: 2017-07-30 00:00:00
tags: java
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I will explain why Hibernate is generating the HHH000179
warning and when ignoring it may introduce bugs in your code.

To understand what this "Narrowing proxy" is all about,
first we must learn about Hibernate proxies.
When we read a value of lazy loaded property or when we call
`EntityManager::getReference` Hibernate returns a proxy object.
This proxy is an instance of a class that was generated at runtime using
library like [Javassit](http://jboss-javassist.github.io/javassist/).

For example for a simple entity:
{% highlight java %}
@Entity
@Table(name = "person")
public class Person extends BaseEntity {
    @Column(name = "person_name", nullable = false)
    private String name;

    @ManyToOne(optional = false, fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "house_id")
    private House house;

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Pet> pets = new HashSet<>(0);

    // ...
}
{% endhighlight %}
Generated proxy class looks similar to:
{% highlight java %}
public class Person_$$_jvst5ed_2 
        extends Person 
        implements HibernateProxy, ProxyObject {
 
    private MethodHandler handler;
    private static Method[] _methods_;
 
    // plenty of other stuff here
 
    public final UUID _d7getId() {
        return super.getId();
    }
 
    public final UUID getId() {
        Method[] var1 = _methods_;
        return (UUID)this.handler.invoke(this, var1[14], var1[15], new Object[0]);
    }
}
{% endhighlight %}

TIP: In Hibernate 5.1 you may write generated 
proxy classes to disk by putting a breakpoint
in [`JavassistProxyFactory::buildJavassistProxyFactory`](https://github.com/hibernate/hibernate-orm/blob/ba3359fe62be258638554fe23a2a0a6a50f7e732/hibernate-core/src/main/java/org/hibernate/proxy/pojo/javassist/JavassistProxyFactory.java#L102)
method and setting 
`factory.writeDirectory` field to a valid path. 
You may want to use a conditional
breakpoint to avoid doing this manually every time a proxy is generated.

The most important point here is that proxy class *extends* entity class.

Now let's see what happens when we mix proxies with inheritance.
Given a simple class hierarchy:
{% highlight java %}
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "animal_type")
public abstract class Pet extends BaseEntity {
    @Column
    private String name;

    @JoinColumn(name = "owner_id", nullable = false)
    @OneToOne(optional = false, fetch = FetchType.LAZY)
    private Person owner;

    public abstract String makeNoise();
    // ...
}

@Entity
@DiscriminatorValue("cat")
public class Cat extends Pet { /* ... */ }

@Entity
@DiscriminatorValue("dog")
public class Dog extends Pet { /* ... */ }
{% endhighlight %}
When we use `EntityManager::getReference` to load a `Pet` we will
get a proxy that extends `Pet` class because Hibernate does not know yet
whatever our pet is a `Cat` or a `Dog`:
{% highlight java %}
// In some earlier transaction:
Cat gerard = new Cat("gerard");
entityManager.persist(gerard);

gerardId = gerard.getId();

// In current transaction:
Pet pet = entityManager.getReference(Pet.class, gerardId);

assertThat(pet)
        .is(hibernateProxy())
        .is(uninitialized())
        .isInstanceOf(Pet.class)
        .isNotInstanceOf(Cat.class);
{% endhighlight %}
We may force Hiberante to query database to load proxied entity
state but that doesn't change proxy identity:
{% highlight java %}
// makeNoise() will access field *via getter* to initialize proxy
logger.info("Pet is a cat: " + pet.makeNoise()); // meow meeeow

assertThat(pet)
        .isNot(uninitialized())
        .isNotInstanceOf(Cat.class);
{% endhighlight java %}
Even though now Hibernate knows that our pet is a `Cat` it cannot
change already loaded proxy class definition,
`Pet` proxy continues to be so.
This may cause you problems because tests like `pet instanceof Cat` will
fail although pet indeed represents a cat.

There is also a second issue that may come up when working with proxies.
If `makeNoise()` method would access pet data via field, proxy would not
be notified about that data access and it wouldn't load data from DB,
causing our method to read an uninitialized field value.
_The moral is that we should always use getters and setters 
when dealing with entity state_.

Now you may think that if we try to load `Pet` again (after proxy was
initialized), Hibernate will return instance of the `Cat` entity.
The behavior displayed by Hibernate is slightly different
because of Hibernate first level cache
that prefers returning already
loaded entity instance than creating a new one:
{% highlight java %}
Pet pet2 = entityManager.getReference(Pet.class, gerardId);

assertThat(pet2)
        .isNotInstanceOf(Cat.class)
        .isSameAs(pet);
{% endhighlight %}

What will happen when we try to explicitly load a `Cat` entity:
{% highlight java %}
// HHH000179: Narrowing proxy to class Cat - this operation breaks ==
Pet pet3 = entityManager.getReference(Cat.class, gerardId);
assertThat(pet3)
        .isInstanceOf(Cat.class)
        .isNot(hibernateProxy());
{% endhighlight %}
Now we got the famous HHH000179 warning, and Hiberante handled
us unproxied `Cat` instance.
But why was this warning generated? Because right now we 
we have two different object (the proxy and the `Cat` instance)
in our session that point to exactly the same entity.

Of course the pet proxy is pointing to the cat instance,
and changes applied to e.g. entity instance are reflected in the proxy state:
{% highlight java %}
assertThat(pet.getName())
    .isEqualTo("gerard");

assertThat(pet)
    .isNotSameAs(pet3);

// set via Cat entity
pet3.setName("proton");

// reflected via proxy
assertThat(pet.getName())
    .isEqualTo("proton");
{% endhighlight %}

So you may think that having two representation of the same DB row 
in memory is OK,
but the real troubles begin if we do not override `equals()` and `hashCode()`
methods properly. This is demonstrated by example:
{% highlight java %}
// Alice is owner of the cat
Person alice = entityManager.find(Person.class, aliceId);

// Alice can own and not own the same cat...
assertThat(alice.getPets().contains(pet))
        .isFalse();

assertThat(alice.getPets().contains(pet3))
        .isTrue();

// But only if we rely on default equals() and 
// hashCode() implementation
{% endhighlight %}
Fortunately this can be easily fixed by providing `equals()` implementation
that is based either on primary key or business key equality, for example:
{% highlight java %}
@MappedSuperclass
public abstract class BaseEntity {
    @Id
    @Type(type="binary(16)")
    private UUID id;

    protected BaseEntity() {
        this.id = UUID.randomUUID();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || !(o instanceof BaseEntity)) return false;

        BaseEntity that = (BaseEntity) o;

        // remember to use *getters*
        return getId().equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getId().hashCode();
    }
}
{% endhighlight %}

We may also reproduce above behaviour with lazy loading,
you can find an example of how to do this in the attached source code.

#### Significance in the real world application

Recently I developed a module in an application that was based on huge
in-house framework (Ughhh). This framework let's call it X
contained some of the entities that we used, but we have no way of
modifying them. The only way to add some fields to an already existing entity
was to extend it (fortunately for us, most entities in X were declared
as base classes with inheritance strategy SINGLE_TABLE).
At the end of this project we had plenty of small class hierarchies
consisting only of super class and a single subclass.
We also had plenty of references from other entities to either
this sup or super classes. As you may expect this was a fertile 
ground for Hibernate HHH000179 warnings, and so I devoted a few hours of
my time to figure out what this warning is all about. In our case
providing proper `equals()` and `hashCode()` was all that was needed.
But just to sum up I want to present the last, more real world example.

Shipped with framework X:
{% highlight java %}
@Entity
@Table(name = "extensible_user")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "discriminator")
@DiscriminatorValue("NOT_USED")
public class LegacyUser {
    @Id
    @GeneratedValue
    private Long id;

    @Column
    private String userPreference1;

    @Column
    private String userPreference2;
    // ...
}

@Entity
@Table(name = "document")
public class LegacyDocument {
    @Id
    @GeneratedValue
    private Long id;

    @Column
    private String contents;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    // !!! Entity referes to super class !!!
    private LegacyUser owner;

    // ...
}
{% endhighlight %}
Shipped with my module:
{% highlight java %}
@Entity
@DiscriminatorValue("EXTENDED")
public class ExtendedUser extends LegacyUser {
    @Column
    private String userPreference3;
    // ...
}

@Entity
@Table(name = "comment")
public class Comment {
    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(/*...*/)
    @JoinColumn(name = "document_id")
    private LegacyDocument document;

    @ManyToOne(/*...*/
    @JoinColumn(name = "author_id")
    // !!! Entity refers to subclass !!!
    private ExtendedUser author;

    @Column
    private String contents;
    // ...
}
{% endhighlight %}
As you can see legacy class `Document` is using `LegacyUser` to refer to
a system user. New class `Comment` is using `ExtendedUser` to refer to
a system user.

Without proper `equals()` implementation we may get into troubles:
{% highlight java %}
LegacyDocument document = 
    entityManager.find(LegacyDocument.class, documentId);

// we load some data from document owner
LegacyUser documentOwner = document.getOwner();
doSomethingWithOwner(documentOwner);

// HHH000179: Narrowing proxy to class ExtendedUser 
//  - this operation breaks ==
// When Hibernate loads comment that has 
// field of type ExtendedUser with the same Id as LegacyUser 
// it realizes that documentOwner is indeed ExtendedUser.
// So this time Hibernate could figure out that 
// it generated wrong proxy without querying DB.
List<Comment> comments = entityManager.createQuery(
            "select c from Comment c where c.document.id = :docId",
            Comment.class)
        .setParameter("docId", document.getId())
        .getResultList();

// Now the most interesting part
ExtendedUser commentAuthor = comments.get(0).getAuthor();

// comment author and doc author is the same user
assertThat(commentAuthor.getId())
        .isEqualTo(documentOwner.getId());

// but...
assertThat(commentAuthor)
        .isNotSameAs(documentOwner);

// Now without overloading hashCode()/equals() we may
// expect troubles...
Set<LegacyUser> users = new HashSet<>();
users.add(commentAuthor);
users.add(documentOwner);

assertThat(users).hasSize(2);
{% endhighlight %}

And that is all that I wanted to say about HHH000179. 
The most important thing that
you should remember from this article is that with 
good `equals()` and `hashCode()` implementation
HHH000179 warning can be safely ignored.

Source code: [https://github.com/marcin-chwedczuk/hibernate_narrowing_proxy_warning_demo](https://github.com/marcin-chwedczuk/hibernate_narrowing_proxy_warning_demo)

