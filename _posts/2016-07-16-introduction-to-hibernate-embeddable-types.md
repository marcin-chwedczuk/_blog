---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: Introduction to Hibernate embeddable types
date:   2016-07-16 00:00:00
tags: java hibernate
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---
#### Entities vs Value types

When we create domain model we must deal with two kinds of objects:
entities and value types. Entities represents objects that have some notion of 
identity like person or a vehicle. Person may change name or even sex but we still use
*the same* object to represent that particular person, we only update object attributes
(e.g. even if I change my name I'm still myself).
Entities always have some kind of identifier that allows us to
distinguish them, this may be a 
[surrogate key](https://en.wikipedia.org/wiki/Surrogate_key) like `Long id` or
a [natural key](https://en.wikipedia.org/wiki/Natural_key) 
like national id/social security number in case of person.

The other kind of objects that we encounter in domain model are value types.
Value types represent things like addresses, phone numbers, money amounts, currencies etc.
Value types are immutable and don't need to have any identifier -
two value types are equal if they contents are equal. If we need to update value type
we just create a new instance of value type with updated attributes.

What this have to do with embeddable types?
In most cases embeddable types should be used to represent only value types
of your domain model.  
Now let's see the code!

#### Embeddable in Hibernate

We will start by creating `User` entity that will have two embeddable value types
`PhoneNumber` and `MoneyAmount`:
{% highlight java %}
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue
    private Long id;

    private String username;
    private PhoneNumber contactPhoneNumber;
    private MoneyAmount availableFunds;

    // constructors, getters, setters, methods etc.
}
{% endhighlight %}
We don't need to use any additional annotations to map embeddable types,
we just declare them like any other field. Later we will see that
we may change embeddable type mappings when needed.

Now let's see how `PhoneNumber` value type looks like.
Since it is our first value type I will present entire class: 
{% highlight java %}
@Embeddable
public class PhoneNumber implements Serializable {
    @Column(length = 16, nullable = false)
    private String phoneNumber;

    protected PhoneNumber() { }

    public PhoneNumber(String phoneNumber) {
        // You can add validation here
        this.phoneNumber = Objects.requireNonNull(phoneNumber);
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || !(o instanceof PhoneNumber)) return false;

        PhoneNumber that = (PhoneNumber) o;
        return phoneNumber.equals(that.phoneNumber);
    }

    @Override
    public int hashCode() {
        return phoneNumber.hashCode();
    }

    @Override
    public String toString() {
        return "phone: " + phoneNumber;
    }
}
{% endhighlight %}
First thing we should notice is that `PhoneNumber` instances are immutable.
We can set `phoneNumber` using constructor,
but we cannot change it.
Notice also that we overriden `equals()` and `hashCode()` to
provide value equality - two phone numbers are equal if they string
representations are equal.
To improve debugging experience we also overriden `toString()` method.

The other class `MoneyAmount` looks like this:
{% highlight java %}
@Embeddable
public class MoneyAmount implements Serializable {
    private BigDecimal amount;

    @Column(length = 3, nullable = false)
    private String currency;

    // constructor getters etc.

    public MoneyAmount add(MoneyAmount m) { /* ... */ }
    public MoneyAmount subtract(MoneyAmount m) { /* ... */ }
    public boolean isLessThan(MoneyAmount other) { /* ... */ }

    // equals, hashCode, toString 
}
{% endhighlight %}
Notice that this class provides additional operations like `add()`. 
Because value types are immutable we cannot change already
exiting `MoneyAmount` instance, instead we return a new object that
will represent result of the `add()` operation.

Now let's get to the Hibernate part.
Embeddable types must be marked with 
`@Embeddable` annotation,
they can contain one or more fields and every 
field may carry `@Column` mappings.
Embeddable types may contain other embeddable types,
but they cannot contain `@Id` field.

When Hibernate stores embeddable types in database they are
stored in table of the entity that contains them.
For example for our `User` entity Hibernate will generate table:
{% highlight sql %}
CREATE TABLE users
(
  id bigint NOT NULL, -- User

  amount numeric(19,2), -- MoneyAmount
  currency character varying(3) NOT NULL,

  phonenumber character varying(16) 
        NOT NULL, -- PhoneNumber

  username character varying(255), -- User
  
  CONSTRAINT users_pkey PRIMARY KEY (id)
)
{% endhighlight %}

Sometimes we want to change e.g. one of the column names of the embeddable type 
but only in certain containing type. 
For example let's say that we want to map `PhoneNumber`
in `User` to `phone_number` column. We may do this using `@AttributeOverride` annotation:
{% highlight java %}
public class User {
    // ...

    @AttributeOverrides({
        @AttributeOverride(name = "phoneNumber",
                column = @Column(name = "phone_number", length = 16, nullable = false))
    })
    private PhoneNumber contactPhoneNumber;

    // ...
}
{% endhighlight %}
Unfortunately when we override column attributes we must redefine *all* of them, and
syntax to do so it pretty verbose.

Now it's time to save some ickle embeddables to database:
{% highlight java %}
User bob = new User(
    "bob",
    new PhoneNumber("111-222-333"),
    new MoneyAmount(new BigDecimal(100), "EUR"));

entityManager.persist(bob);
{% endhighlight %}
This operation will result in SQL:
{% highlight sql %}
insert into users
    (amount, currency, phone_number, username, id) 
values
    (100, 'EUR', '111-222-333', 'bob', 1)
{% endhighlight %}

We may also update embeddable type by providing new instance:
{% highlight java %}
public class User {
    // ...
    public void chargeUser(MoneyAmount amount) {
        if (availableFunds.isLessThan(amount))
            throw new IllegalStateException(
                    "User don't have enough money available.");

        availableFunds = availableFunds.subtract(amount);
    }
    // ...
}

User bob = entityManager.find(User.class, 1);

bob.chargeUser(
    new MoneyAmount(new BigDecimal(10), "EUR")
    );
{% endhighlight %}
This will generate `UPDATE`:
{% highlight sql %}
update users 
set
    amount=90.00,
    currency='EUR',
    phone_number='111-222-333',
    username='bob' 
where
    id=1
{% endhighlight %}

##### Embeddable types and nullability

Hibernate stores null embeddable type as `NULL` values in
all embeddable type columns. You can save object with `null`
embeddable type only if all embeddable type columns are nullable.
When you try to do this with embeddable type that contains non-null 
columns Hibernate will throw exception:
{% highlight java %}
Dummy d = new Dummy();
d.setPhoneNumber(null);
entityManager.persist(d);

// at commit:
// ERROR: null value in column "phonenumber" violates not-null constraint
{% endhighlight %}

##### Sharing embeddable types between entities

Embeddable types follow value semantics, this means when we save the same
instance of embeddable type in two different entities and then read back
these entities we will get two *instances* of embeddable type:
{% highlight java %}
PhoneNumber phoneNumber = new PhoneNumber("111-222-333");

Dummy d1 = new Dummy();
d1.setPhoneNumber(phoneNumber);

Dummy d2 = new Dummy();
d2.setPhoneNumber(phoneNumber);

// true
System.out.println(d1.getPhoneNumber() == d2.getPhoneNumber());

entityManager.persist(d1);
entityManager.persist(d2);
entityManager.flush();
entityManager.clear();

d1 = entityManager.find(Dummy.class, d1.getId());
d2 = entityManager.find(Dummy.class, d2.getId());

// false
System.out.println(d1.getPhoneNumber() == d2.getPhoneNumber());

// true
System.out.println(d1.getPhoneNumber().equals(d2.getPhoneNumber()));
{% endhighlight %}
This is generally not a problem because we should compare value types
using `equals()` anyway.

##### Mapping many instances of embeddable type in the same entity

Let's say we want to extend our `User` entity to allow users to provide
second phone number. If we only add second `PhoneNumber` field to the `User` class,
Hibernate will not know how to name columns of the second `PhoneNumber`. 
This will result in the exception:
{% highlight no-highlight %}
org.hibernate.MappingException: 
    Repeated column in mapping for entity: User column: phoneNumber 
{% endhighlight %}
We can easly fix this using `@AttributeOverride` annotation:
{% highlight java %}
public class User {
    // ...
    private PhoneNumber contactPhoneNumber;

    @AttributeOverrides({
            @AttributeOverride(name = "phoneNumber",
                    column = @Column(name = "backup_phone_number", length = 16, nullable = false))
    })
    private PhoneNumber backupPhoneNumber;

    // ...
}
{% endhighlight %}

#### Collections of embeddable types

Embeddable types may be used as collection elements. Let's extend our `User` class
so that user can have any number of phone numbers:
{% highlight java %}
public class User {
    // ...

    @ElementCollection
    @CollectionTable(
            name = "user_phone_numbers",
            joinColumns = @JoinColumn(name = "user_id"))
    private Set<PhoneNumber> phoneNumbers = new HashSet<>();

    public Collection<PhoneNumber> getPhoneNumbers() {
        return Collections.unmodifiableCollection(phoneNumbers);
    }

    public void addPhoneNumber(PhoneNumber number) {
        phoneNumbers.add(number);
    }

    public void removePhoneNumber(PhoneNumber number) {
        phoneNumbers.remove(number);
    }

    // ...
{% endhighlight %}
In this case collection elements are owned by entity class, if entity is removed
all collection elements are removed as well. 
In database this will be represented by two tables:
![How embeddable collections are stored in database](assets/images/2016-07-16/embeddable_collection.png)

Before you start using this method you must know 
how Hibernate will perform inserts/updates. 
Basically Hibernate first will remove all rows associated with given entity
and then will perform many inserts (one insert per one collection element).
This is horrible from performance point of view so use this mapping only with small collections.

Here is a bit of code to illustrate the point:
{% highlight java %}
User b = entityManager.find(User.class, 1);
// user already have one phone number
b.addPhoneNumber(new PhoneNumber("333-555-666"));
{% endhighlight %}
This will result in SQL:
{% highlight sql %}
delete from user_phone_numbers 
where
    user_id=1

insert into user_phone_numbers
    (user_id, phoneNumber) 
values
    (1, '333-555-666')

insert into user_phone_numbers
    (user_id, phoneNumber) 
values
    (1, '111-222-333')
{% endhighlight %}

##### Allowing duplicates in collection

If we want to allow duplicates in embeddable type collection we should map
it as a bag:
{% highlight java %}
@ElementCollection
@CollectionTable(
        name = "user_phone_numbers",
        joinColumns = @JoinColumn(name = "user_id"))
@org.hibernate.annotations.CollectionId(
        columns = @Column(name = "phone_number_id"),
        type = @org.hibernate.annotations.Type(type = "long"),
        generator = "sequence"
)
private Collection<PhoneNumber> phoneNumbers = new ArrayList<>();
{% endhighlight %}
This will result in database schema:
![How embeddable collections are stored in database](assets/images/2016-07-16/embeddable_collection2.png)
Unfortunatelly this will not improve bad performance of embeddable type collections.

You can improve performance a bit (mainly with inserts) using `@OrderColumn` annotation,
more informations can be found in these articles:

* [StackOverflow: strange delete/insert behaviour](http://stackoverflow.com/questions/3742897/hibernate-elementcollection-strange-delete-insert-behavior)
* [How to Optimize Hibernate ElementCollection Statements](https://dzone.com/articles/how-optimize-hibernate)

#### The End

In this blog post I only scratched the surface of the embeddable types, 
there is more to learn about them. If you want to dig deeper I advice reading
great book: [Java Persistence with Hibernate 2nd](https://amzn.com/1617290459).

Thats all for today, thanks for reading!

