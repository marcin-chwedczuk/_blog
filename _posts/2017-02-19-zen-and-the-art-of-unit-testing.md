---
layout: post
cover: 'assets/images/zen_cover2.jpg'
title: Zen and the Art of Unit Testing
date: 2017-02-19 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this blog post we will concern ourselves with unit testing of
classic 3-layer business applications. We will assume that
all business logic lives in services and components,
that these services operate on entities that are stored and retrieved
from relational database, 
and that these entities doesn't contain any logic.
Moreover we assume usage of 
DTO ([Data Transfer Object](https://en.wikipedia.org/wiki/Data_transfer_object))
to pass data between GUI and application services.

![High level overview of 3-layer architecture](assets/images/2017-02-19/L3arch.svg)

[Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)
is indispensable when it comes to unit testing of
modern business applications. Without DI you are forced to write slow
and difficult to maintain integration tests instead of unit tests.
If you don't know what DI
is or if you don't used it before please read articles on [Wikipedia](https://en.wikipedia.org/wiki/Dependency_injection) and [Martin Fowler site](https://martinfowler.com/articles/injection.html),
and return here after you are comfortable with both idea and usage of DI.

Now we are ready to start, we will follow Confucius advice:

> By three methods we may learn wisdom: First, by reflection, which is noblest;
> Second, by imitation, which is easiest; 
> and third by experience, which is the bitterest.
>
> Confucius

and learn by imitation,
by observing how we may unit test `UserService` component.
We will use popular [jUnit](http://junit.org/junit4/) unit testing framework
with [Mockito](http://site.mockito.org/) mocking library.

#### `UserService` component

`UserService` implements following business requirements:

* Users forgot thier passwords from time to time, application should
 provide a way to reset forgotten passwords.
* To reset thier passwords users must provide the email address they use
 to login to our system.
* If provided email address does not belong to any user, application 
 should do nothing. Otherwise application should generate unique
 password reset token, set it validity to next 24 hours and send
 to provided email address message with link to reset password form.
 Link should contain reset password token.
 In both cases application should show to user success message.
* Every user should have each own token. Tokens should be hard to
 guess or enumerate (no numbers here). Token may be used only once
 to reset password. If we want to reset password again we need a new token.
 Token is valid for 24 hours starting from the date it was created, after 24
 hours token cannot be used to change password.
* When user open reset password link in her browser it should be presented
 with a form that allows to enter a new password. After clicking OK,
 application should validate token used in link, and if it is still
 valid application should change user password and make token invalid.
 Then application should send password change confirmation message to user.
 In case of expired token application should show warning to user.

![Password change flow](assets/images/2017-02-19/flow.svg)

WARNING Before implementing real password reset feature please read
[Everything you ever wanted to know about building a secure password reset feature](https://www.troyhunt.com/everything-you-ever-wanted-to-know/).

Now when we understand business requirements we may attempt to implement
`UserService` component:
{% highlight java %}
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final DateTimeProvider dateTimeProvider;
    private final CryptoService cryptoService;

    public UserServiceImpl(
		UserRepository userRepository,
		DateTimeProvider dateTimeProvider,
		CryptoService cryptoService,
		NotificationService notificationService)
    {
        this.userRepository = requireNonNull(userRepository);
        this.notificationService = requireNonNull(notificationService);
        this.dateTimeProvider = requireNonNull(dateTimeProvider);
        this.cryptoService = requireNonNull(cryptoService);
    }

    @Override
    public void startResetPasswordProcess(String userEmailAddress) {
        User user = userRepository.findByEmailAddress(userEmailAddress);
        if (user == null)
            return;

        UUID token = UUID.randomUUID();
        LocalDateTime tokenValidityEndDate =
                dateTimeProvider.now().plusDays(1);

        user.setResetPasswordToken(token);
        user.setResetPasswordTokenValidityEndDate(
                tokenValidityEndDate);

        ResetPasswordNotificationData notificationData = 
            new ResetPasswordNotificationData(
                user.getEmail(),
                token,
                tokenValidityEndDate);

        notificationService
            .sendResetPasswordNotification(notificationData);
    }

    @Override
    public void finishResetPasswordProcess(
            String userEmailAddress,
            String newPassword,
            UUID resetPasswordToken)
    {
        User user = userRepository.findByEmailAddress(userEmailAddress);
        if (user == null)
            return;

        if (user.getResetPasswordToken() == null)
            return;

        if (!user.getResetPasswordToken().equals(resetPasswordToken))
            return;

        if (user.getResetPasswordTokenValidityEndDate()
                .isBefore(dateTimeProvider.now()))
            return;

        user.setResetPasswordToken(null);
        user.setResetPasswordTokenValidityEndDate(null);

        String newPasswordHash = cryptoService.sha1(newPassword);
        user.setPasswordHash(newPasswordHash);

        notificationService
            .sendPasswordChangedConfirmation(user.getEmail());
    }
}
{% endhighlight %}
`UserService` operates on the following `User` entity:
{% highlight java %}
public class User {
    private Long id;
    
    private String email;
    private String passwordHash;
    
    private UUID resetPasswordToken;
    private LocalDateTime resetPasswordTokenValidityEndDate;
    
    // getter, setter, etc.
}
{% endhighlight %}
And requires four other components to work, namely: `UserRepository`,
`NotificationService`, `DateTimeProvider` and `CryptoService`:
{% highlight java %}
public interface UserRepository {
    User findByEmailAddress(String emailAddress);
}
    
public interface NotificationService {
    void sendResetPasswordNotification(
            ResetPasswordNotificationData data);
    void sendPasswordChangedConfirmation(String email);
}
    
public interface DateTimeProvider {
    LocalDateTime now();
}
    
public interface CryptoService {
    String sha1(String input);
}
{% endhighlight %}
`DateTimeProvider` dependency was introduced solely for the purpose
of easier unit testing, as we will find out later.

Design of `UserService` follows principles of DI, component advertises
all dependencies it needs as constructor parameters.
DI containers may then use [constructor based dependency injection](https://www.tutorialspoint.com/spring/constructor_based_dependency_injection.htm) to
provide implementations of these dependencies.
Right now we have only implementation of `UserService`, `UserRepository` and
other dependencies are not implemented yet.
Nevertheless with usage of stubs and
mocks we may test `UserService` implementation right now.

#### Writing tests for `startResetPasswordProcess`

By convention we should put tests for `ComponentName` into `ComponentNameTest`
class. For example tests for `UserServiceImpl` should be put 
into `UserServiceImplTest` class.

When you use Maven you should put your test class in 
the same package that contains tested component.
For example `UserServiceImpl`
is part of `io.mc.letsmock.demo` package, so `UserServiceImplTest`
should also belong to `io.mc.letsmock.demo` package.
With Maven the only difference between application code and test code is the
directory in which code resides. Application code will be in `src/main/java`
directory and test code will be in `src/test/java` directory:
{% highlight no-highlight %}
.
`-- src
    |-- main
    |   `-- java
    |       `-- io
    |           `-- mc
    |               `-- letsmock
    |                   `-- demo
    |                       |-- UserServiceImpl.java
    |                       `-- UserService.java
    `-- test
        `-- java
            `-- io
                `-- mc
                    `-- letsmock
                        `-- demo
                            `-- UserServiceImplTest.java
{% endhighlight %}
Another popular
convention used with e.g. Ant is to put applicaiton code into
`mycompany.productA.xx.yy` package and test code
into `mycompany.productA.test.xx.yy` package.

The important thing here is that team should choose one particular convention
how to name tests and where to put test classes and stick to it.
If you use Maven I strongly encourage using conventions that I described above.

##### Naming tests

After reading requirements we come to conclusion that we need the following
test cases to be sure that `startResetPasswordProcess` method works:

* When we couldn't find `User` with specified email address, component should
 do not nothing, in particular is should not crash
* When there is `User` with specified email address, component should set
 `resetPasswordToken` and `resetPasswordTokenValidityEndDate` fields on `User`
 instance to respectively 
 newly generated token, and `LocalDateTime` instance that represent point
 in time 24 hours later than now.
* When there is `User` with specified email address, component should send
 message to user using `NotificationService` with token.

Notice that each of these test cases test only single thing, this is
very important if we want to have clean and independent tests.
As method should do only one thing, 
test should test only one "outcome" of a method.
When you gain more experience you may want to relax this rule, 
but if you just started unit testing
you should stick with it for some time.

There are two schools when it comes to naming test methods, first
school teaches that test name should consists of three parts:
{% highlight java %}
@Test
void scenario_conditions_outcome()
{% endhighlight %}
`scenario` is the thing that we want to test, this in most cases
will be the name of the method that we want to test.
`conditions` describe the state of program that tested method
may expect when it is called. `outcome` is the state of the program
that we expect after tested method returns.

To give you a feeling how this naming schema works here
are some dummy tests for Java `+` operator:
{% highlight java %}
void plusOperator_given1And5_returns6()
void plusOperator_given1AndMinus7_returnsMinus6()
void plusOperator_whenResultIsGreaterThanMAXINT_wrapsResultsUsingMod2Arithmetic()
{% endhighlight %}

The second school took inspiration for thier naming schema from 
[BDD](https://en.wikipedia.org/wiki/Behavior-driven_development)
movement.
This school advices that 
test names should consists of full sentences that describe both
conditions and outcome of tested method. 
Names for `+` operator tests following this
schema looks like:
{% highlight java %}
void _1_plus_5_should_return_6()
void _1_plus_minus_7_should_return_minus_6()
void when_result_of_addition_is_greater_than_MAXINT_plus_operator_should_wrap_result_using_mod_2_arithmetic()
{% endhighlight %}
As you can see test names generated using this approach 
can be quite verbose at times. Verbosity of this schema is great advantage 
because the main purpose of test name is to tell you
what exactly is not working when given test fails. 

I prefer first school with scenario/conditions/outcome division of test name,
so I will use it exclusivly in the rest of this post.

Returning to `startResetPasswordProcess` we should create three tests:
{% highlight java %}
void startResetPasswordProcess_givenEmailNotBelongingToAnyUser_doesNothing()
void startResetPasswordProcess_givenEmailOfExistingUser_generatesToken()
void startResetPasswordProcess_givenEmailOfExistingUser_sendsNotificationToUser()
{% endhighlight %}
These test names are not as descriptive as they may be, but are close
to what you may expect in average enterpraise application.

##### Anatomy of test method

Our first test will check that `startResetPasswordProcess` won't throw
exceptions when called with email address of non-existing user.
But to test `UserServiceImpl` class we must create it's instance and this
will require providing all necessary dependencies.
Fortunately we may use Mockito library to 
to generate 
dummy implementations of `UserRepository`, `NotificationService` 
and others. By default these dummy implementations do nothing and
are similar to handcrafted test stubs like:
{% highlight java %}
public class UserRepositoryStub implements UserRepository {
    @Override
    public User findByEmailAddress(String emailAddress) {
        return null;
    }
}
{% endhighlight %}
But we will soon see that we can instruct Mockito to return
values from these stubs or to check if a given method was called
on dummy object.

Below you can see our first test code:
{% highlight java %}
@Test
public void startResetPasswordProcess_givenEmailNotBelongingToAnyUser_doesNothing() {
   // arrange
   UserRepository userRepository = mock(UserRepository.class);
   DateTimeProvider dateTimeProvider = mock(DateTimeProvider.class);
   CryptoService cryptoService = mock(CryptoService.class);
   NotificationService notificationService = mock(NotificationService.class);

   when(userRepository.findByEmailAddress("unknown@example.com"))
	   .thenReturn(null);

   UserServiceImpl userService = new UserServiceImpl(
	   userRepository,
	   dateTimeProvider,
	   cryptoService,
	   notificationService);
   // act
   userService.startResetPasswordProcess("unknown@example.com");

   // assert
   verify(notificationService, never())
	   .sendResetPasswordNotification(any());

   verify(notificationService, never())
	   .sendPasswordChangedConfirmation(anyString());
}
{% endhighlight %}
Before we dig into details let's look at this test from high level
point of view. Almost every test method can be divided into three
parts called Arrange-Act-Assert or Given-When-Then. I used comments
to signify when each of these parts start. Each of these parts has
different purpose. In Arrange part we must create instance of
tested component and all necessary test data and
also we must set up Mockito mocks.
If we may compare test method to theater play, then Arrange is like 
preparing scene, costiumes and lights.

The first four lines of our test Arrange section are responsible for
creating dummy implementations of `UserServiceImpl` dependencies:
{% highlight java %}
UserRepository userRepository = mock(UserRepository.class);
DateTimeProvider dateTimeProvider = mock(DateTimeProvider.class);
CryptoService cryptoService = mock(CryptoService.class);
NotificationService notificationService = mock(NotificationService.class);
{% endhighlight %}
Then we set up one of our stub objects:
{% highlight java %}
when(userRepository.findByEmailAddress("unknown@example.com"))
	.thenReturn(null);
{% endhighlight %}
Here we instruct Mockito that dummy implementation generated for 
`UserRepository::findByEmailAddress`
should return `null` when called with `"unknown@example.com"` string.
But to be honest these lines are redundant because
method stubs generated by Mockito by default return `null` for
reference types, default values for primitives and empty collections
for methods returning collections. 
Still I leave them because they 
make purpose of our test more evident.

After Arrange section we have an Act section. Again (so many AAAAs)
returning to our theater play analogy (another A, no pun intended)
Act section is like the actual play, we invoke tested component and let
the code be alive. Act part is usually very short, in most cases
it consists of single line of code:
{% highlight java %}
userService.startResetPasswordProcess("unknown@example.com");
{% endhighlight %}

The last section in test method is Assert when we want to
check results produced by tested code. In our test we check two
assumptions:

1. Invocation of `startResetPasswordProcess` does not throw any exceptions.
 This is tested implicitly by jUnit - test fails when test method throwns
 exception. Since our test passes we are certain that `startResetPasswordProcess`
 doesn't throw any.
2. We want to be ceratain that no notification was send to provided email address
 so we asses with help of Mockit that none of the methods on `NotificationService`
 was called.

Mockito verification syntax is a bit unintuitive, so let's take a closer
look at one of our assertions:
{% highlight java %}
verify(notificationService, never())
	   .sendResetPasswordNotification(any());
{% endhighlight %}
We use `verify` to tell Mockit that we want to preform verification.
`never()` means that we expect that method was not called on dummy object.
Then we specify method that should not be called,
in our case `sendResetPasswordNotification`. 
We pass `any()` as method parameter to tell Mockito that method
should just not be called, and that we don't care about parameters
that was passed to it. Mockito is quite flexible here
and we may for example verify that method should not be called with given
set of parameters but must be called with another. We may also replace
`never()` with one of several predicates like e.g. `times(2)` to assert that
method was called twice.

#### Testing with assertions

Our first test assured us that `startResetPasswordProcess` works correctly
when given email address of unknown user. Now it is time to check if
it also works correctly given email addresses of existing user.
Our second test will check if given valid email address `UserServiceImpl`
generates a new token for `User` and sets it exiry date correctly.
We also will check that user password is not altered in any way by
starting reset password process (it should change only when we *finish*
password change process).
Here is our second test code:
{% highlight java %}
@Test
public void startResetPasswordProcess_givenEmailOfExistingUser_generatesToken() {
   // arrange
   UserRepository userRepository = mock(UserRepository.class);
   DateTimeProvider dateTimeProvider = mock(DateTimeProvider.class);
   CryptoService cryptoService = mock(CryptoService.class);
   NotificationService notificationService = mock(NotificationService.class);

   UserServiceImpl userService = new UserServiceImpl(
	   userRepository,
	   dateTimeProvider,
	   cryptoService,
	   notificationService);

   User joe = new User();
   joe.setEmail("joe@example.com");
   joe.setResetPasswordToken(null);
   joe.setResetPasswordTokenValidityEndDate(null);
   joe.setPasswordHash("old-password-hash");

   when(userRepository.findByEmailAddress("joe@example.com"))
	   .thenReturn(joe);

   when(dateTimeProvider.now())
	   .thenReturn(LocalDateTime.of(2017,3,10, 0,0));

   // act
   userService.startResetPasswordProcess("joe@example.com");

   // assert
   assertThat(joe.getResetPasswordToken())
	   .isNotNull();

   assertThat(joe.getResetPasswordTokenValidityEndDate())
	   .isEqualTo(LocalDateTime.of(2017,3,11, 0,0));

   assertThat(joe.getPasswordHash())
	   .withFailMessage("Password should not be changed")
	   .isEqualTo("old-password-hash");
}
{% endhighlight %}
Arrange section of our second test does not differe much from Arrange
section of our first test, except that we added code for creation
of an `User` instance. Notice that we populate `User` with carefuly 
choosen data that will allow us to test `startResetPasswordProcess`
implementation easily e.g. we set both `resetPasswordToken` and
`resetPasswordTokenValidityEndDate` to `null`.
Then we instruct Mockito to return our `User` instance when we
ask `UserRepository` for user with `joe@example.com` email address:
{% highlight java %}
when(userRepository.findByEmailAddress("joe@example.com"))
	.thenReturn(joe);
{% endhighlight %}

We should strive to make our unit tests as much deterministic as possible.
Unit test that sometimes fails without a reason is burden rather than
a benefit, and should be either fixed or removed.
To make unit more robust we should avoid depending on external input
like information about current time. To facilitate that I decided to
introduce `DateTimeProvider` component with sole purpose of making
unit tests more predictable. With small help of Mockito we are now
masters of time:
{% highlight java %}
when(dateTimeProvider.now())
	.thenReturn(LocalDateTime.of(2017,3,10, 0,0));
{% endhighlight %}

After all this preparations, we are now free to invoke `startResetPasswordProcess`
and check it's outcome. In unit tests we mainly use assertions to check
correctness of tested code. JUnit already comes with handy assertion library
that we may use like this:
{% highlight java %}
import static org.junit.Assert.*;

assertNotNull(joe.getResetPasswordToken());
assertEquals("old-password-hash", joe.getPasswordHash());
{% endhighlight %} 
When JUnit assertion fails it throws `AssertionError`, test fails and
we get error similar to:
{% highlight java %}
java.lang.AssertionError
	at org.junit.Assert.fail(Assert.java:86)
	at org.junit.Assert.assertTrue(Assert.java:41)
	at org.junit.Assert.assertNotNull(Assert.java:712)
	at org.junit.Assert.assertNotNull(Assert.java:722)
	at io.mc.letsmock.demo.UserServiceImplTest.startResetPasswordProcess_givenEmailOfExistingUser_generatesToken(UserServiceImplTest.java:113)
{% endhighlight %}
Unfortunately error messages generated by JUnit assertions are not
always the best way to find out what went wrong with failing tests.
JUnit assertions are also cumbersome to use at times. From these
and other reasons I prefer to use assertions from assertJ library
and I used them when I wrote our second test:
{% highlight java %}
import static org.assertj.core.api.Assertions.assertThat;

assertThat(joe.getResetPasswordToken())
	.isNotNull();

assertThat(joe.getResetPasswordTokenValidityEndDate())
	.isEqualTo(LocalDateTime.of(2017,3,11, 0,0));

assertThat(joe.getPasswordHash())
	.withFailMessage("Password should not be changed")
	.isEqualTo("old-password-hash");
{% endhighlight %}
Here we check three things:

1. New password reset token was generated and assigned to `resetPasswordToken`
 property
2. Expiry date of password reset token was set correctly (token should be
 valid for the next 24 hours)
3. Current user password was not changed

Notice also that we use `withFailMessage` to provide additional
information in case our third assertion fails.
Without `withFailMessage` we would get following error:
{% highlight no-highlight %}
org.junit.ComparisonFailure: 
Expected :"old-password-hash"
Actual   :"xxx"
{% endhighlight %}
With `withFailMessage` we get:
{% highlight no-highlight %}
java.lang.AssertionError: Password should not be changed
{% endhighlight %}

#### Merciless refactoring

Right now both of our tests pass, but we see a lot of code duplication
between them. Now it is a good time to exctract common parts of both
tests into `setUp` method and to create some fields in our test class:
{% highlight java %}
public class UserServiceImplTestAfterRefactoring {
    private UserRepository userRepository;
    private DateTimeProvider dateTimeProvider;
    private CryptoService cryptoService;
    private NotificationService notificationService;

    private UserServiceImpl userService;

    @Before
    public void setUp() {
        userRepository = mock(UserRepository.class);
        dateTimeProvider = mock(DateTimeProvider.class);
        cryptoService = mock(CryptoService.class);
        notificationService = mock(NotificationService.class);

        userService = new UserServiceImpl(
                userRepository,
                dateTimeProvider,
                cryptoService,
                notificationService);
    }

    @Test
    public void startResetPasswordProcess_givenEmailNotBelongingToAnyUser_doesNothing() {
        // arrange
        when(userRepository.findByEmailAddress("unknown@example.com"))
                .thenReturn(null);

        // act
        userService.startResetPasswordProcess("unknown@example.com");

        // assert
        verify(notificationService, never())
                .sendResetPasswordNotification(any());

        verify(notificationService, never())
                .sendPasswordChangedConfirmation(anyString());
    }

    @Test
    public void startResetPasswordProcess_givenEmailOfExistingUser_generatesToken() {
        // arrange
        User joe = Fixtures.userJoe();

        when(userRepository.findByEmailAddress("joe@example.com"))
                .thenReturn(joe);

        when(dateTimeProvider.now())
                .thenReturn(LocalDateTime.of(2017,3,10, 0,0));

        // act
        userService.startResetPasswordProcess("joe@example.com");

        // assert
        assertThat(joe.getResetPasswordToken())
                .isNotNull();

        assertThat(joe.getResetPasswordTokenValidityEndDate())
                .isEqualTo(LocalDateTime.of(2017,3,11, 0,0));

        assertThat(joe.getPasswordHash())
                .withFailMessage("Password should not be changed")
                .isEqualTo("old-password-hash");
    }
}
{% endhighlight %}
After refacting both dependencies and tested components are
now stored in fields of test class. 
JUnit calls any method annotated by `@Before` before executing each
of test methods contained in test class. 
This makes `setUp` method suitable place to initialize fields
that will be used by many tests. 

Now you may be tempted to move initialization code to the test class
constructor, but don't do that. Unit tests should be independent of
each other. One of the worst sins when writing unit tests is to write
a test that depends on some data created by other test methods. 
Such incorrect test may pass when we ran all tests but will
fail when run it alone. This is one of the worst things that may happen
when writing unit tests, and cleary shows that we do something wrong.
Instead every test should create it's own test data and should use 
fresh Mockito stubs. Later you will appreaciate this independence of
tests when you will try to run tests in parallel.


TODO: Stubs and mocks

TODO: Refactoring, extracting common code

TODO: Code coverage
