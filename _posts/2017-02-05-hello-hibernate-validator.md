---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Hello, Hibernate Validator
date: 2017-02-05 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In every enterprise application there is a need for
validation. You may want to validate data send by user to
your REST service, messages coming to your application from some
other system, or your own entities before saving them to database.

Standard
[JSR 303](http://beanvalidation.org/1.0/spec)
defines API for validating Java Beans without tying us to any
particular implementation.
Nevertheless some implementations are more polished than others,
and subject of this post -
Hibernate Validator is considered one of the best.

#### Project setup

Before we can use Hibernate Validator we must do
some groundwork.

##### Maven dependencies

To use Hibernate Validator we need following Maven dependencies:
{% highlight xml %}
<dependency>
    <groupId>org.hibernate</groupId>
    <artifactId>hibernate-validator</artifactId>
    <version>5.3.4.Final</version>
</dependency>

<dependency>
    <groupId>javax.el</groupId>
    <artifactId>el-api</artifactId>
    <version>2.2</version>
</dependency>
<dependency>
    <groupId>org.glassfish.web</groupId>
    <artifactId>javax.el</artifactId>
    <version>RELEASE</version>
</dependency>
{% endhighlight %}
Hibernate Validator uses Java Unified Expression Language (JavaEL)
to format validation messages. When your application runs
inside JEE container, container already provides JavaEL 
implementation.
Since we want to create a command line application we must provide 
JavaEL implementation ourselves and that's the reason
why we included `javax.el:el-api` and `org.glassfish.web:javax.el` as
dependencies.

Later on to demonstrate all features of Hibernate Validator we will need
Spring DI container and `commons-beanutils` library:
{% highlight xml %}
<dependency>
    <groupId>commons-beanutils</groupId>
    <artifactId>commons-beanutils</artifactId>
    <version>1.9.3</version>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-context</artifactId>
    <version>4.3.5.RELEASE</version>
</dependency>
{% endhighlight %}

##### Obtaining `Validator` instance

After all these preparations we are ready to create `Validator`
instance:
{% highlight java %}
import javax.validation.Validation;
import javax.validation.Validator;

public static void main(String[] args) {
    Validator validator = Validation
                              .buildDefaultValidatorFactory()
                              .getValidator();
}
{% endhighlight %}
Note that we don't have any reference to Hibernate Validator in
our code, instead we are relying on classes and interfaces defined in
JSR 303 (Bean Validation).
This is very similar to how JDBC providers works.

Returned `Validator` instance is thread safe and may be assigned to
static field or registered as a singleton in DI container for later use.

#### Validating beans

##### Property level constraints

The easiest way to define validation rules for a bean
is to use JSR 303 annotations.
We may put annotations on both fields and getters, for example:
{% highlight java %}
public class Person {
    @NotNull           
    private String name;
}
// or:
public class Person {
    @NotNull
    public String getName() {             
        return name;                      
    }                                     
    public void setName(String name) {    
        this.name = name;                 
    }                                     
}
{% endhighlight %}
We should prefer putting annotations on getters since this will
allow for greater flexibility when later we will want to
change our beans.
Said that, to conserve space in this post I will
put annotations on fields from now on.

Here is a simple bean representing a person,
annotated with JSR 303 constraints:
{% highlight java %}
public class Person {
    @NotNull
    @Length(min=1)
    private String name;

    @NotNull
    @Length(min=1)
    private String surname;

    @Range(min=1, max=200)
    private int age;
  
    // getters, setters 
}
{% endhighlight %}
Validation rules should be self evident. There is nothing fancy -
we check that a person must have a non empty name and a non empty
surname, and that an age of a person falls within a range of 1 and 200.

Then we may use Hibernate Validator to check if 
a `Person` instance is valid:
{% highlight java %}
Validator validator = Validation
       .buildDefaultValidatorFactory()
       .getValidator();

Person joe = new Person();
joe.setName("Joe");
joe.setSurname("Doe");
joe.setAge(43);

Set<ConstraintViolation<Person>> constraintViolations =
       validator.validate(joe);

assert constraintViolations.size() == 0; // yeah, no errors
{% endhighlight %}

In rare cases when `Person` is invalid, Hibernate Validator
provides us with all necessary information about what
properties and values are wrong:
{% highlight java %}
Person joe = new Person();
joe.setName(null);
joe.setSurname("Doe");
joe.setAge(1024);

Set<ConstraintViolation<Person>> constraintViolations =
       validator.validate(joe);

for (ConstraintViolation<?> violation: constraintViolations) {
   System.out.format("%10s | %30s | is %10s%n",
           violation.getPropertyPath(),
           violation.getMessage(),
           violation.getInvalidValue()
           );
}
// OUTPUT:
//       age |      must be between 1 and 200 | is       1024
//      name |                may not be null | is       null
{% endhighlight %}

##### Bean level constraints

Some validation rules may be expressed only by using
values of two or more properties, for such rules 
Hibernate Validator provides class-level constrains.
Returning to our `Person` example, suppose that we want to add
two new properties to `Person`: `dateOfBirth` and `dateOfDeath`, with
condition that `dateOfBirth` cannot be later than `dateOfDeath`
(when both dates are present):
{% highlight java %}
public class Person {
    @NotNull
    private LocalDate dateOfBirth;
    private LocalDate dateOfDeath;
    
    // ...
}
{% endhighlight %}
We can express our rule using proprietary (not included in JSR 303)
class-level `@ScriptAssert` annotation:
{% highlight java %}
import org.hibernate.validator.constraints.ScriptAssert;

@ScriptAssert(lang = "javascript",
        script="_.dateOfBirth == null || _.dateOfDeath == null || _.dateOfBirth <= _.dateOfDeath",
        alias="_",
        message = "date of death cannot be before date of birth")
public class Person {
   // ...
} 
{% endhighlight %}
Here I decided to use JavaScript scripting engine (`lang = "javascript"`)
because it
is already shipped with Java SE, moreover JavaScript syntax should be
familiar to any Java developer. Hibernate Validator supports
any implementation adhering to JSR 223 standard
(scripting for the Java platform).

JavaScript expression used as value of `script` argument:
{% highlight javascript %}
_.dateOfBirth == null || 
   _.dateOfDeath == null || 
   _.dateOfBirth <= _.dateOfDeath
{% endhighlight %}
must *always* return either `true` when validation rule is
fullfiled or `false`.
We must also take care of handling `null` values otherwise we may
get pesky `javax.script.ScriptException`.

Inside `script` we may refer to currently validated bean by name of `_this`,
or by name of our choosing if we set `alias` argument like we do in
our example.

`@ScriptAssert` is a duct tape of validation. You should
use it only when performance is not a concern, and you must
provide a solution quickly. In most cases you should prefer
to write you own constraint and validator. Anyway `@ScriptAssert` is
a great example of class-level constraint.

##### Validating child beans

To demonstrate parent-child bean validation we will
add `Address` to `Person` class.
`Address` will be optional so not every `Person` instance will have one,
we only require that if a `Person` has an address it must be a
valid one.
`Address` will be represented by the following bean:
{% highlight java %}
public class Address {
    @NotBlank
    private String street;

    @NotBlank
    private String zipCode;

    @NotBlank
    private String city;

    // getter,setters
}
{% endhighlight %}
Also we must add `address` property to `Person` bean:
{% highlight java %}
public class Person {
    @Valid
    private Address address;
}
{% endhighlight %}
`@Valid` annotation that we put on `address` field
tells Hibernate Validator that
when validating a `Person` the `Address` should also be
validated, but only when address is provided (`address` is non null).
If we require that a `Person` must always have an address we may use
`@NotNull` to enforce that rule:
{% highlight java %}
public class Person {
    @NotNull
    @Valid
    private Address address;
}
{% endhighlight %}

Now when validating person with an invalid address we get:
{% highlight java %}
// ...
Address joeHomeAddress = new Address();
joeHomeAddress.setCity("Warsaw");
joeHomeAddress.setZipCode("00-120");
joe.setAddress(joeHomeAddress);

validator.validate(joe);
// CONSTRAINT VIOLATIONS:
// address.street |               may not be empty | is       null
{% endhighlight %}

##### Validating collections

To demonstrate how collection validation works
we will add a list of contacts
to `Person` bean:
{% highlight java %}
public class Person {
    @Valid
    private List<Contact> contacts;
    // getters,setters,...
}

public abstract class Contact { }

public class EmailContact extends Contact {
    @Email
    private String email;

    public EmailContact() { }
    public EmailContact(String email) {
        this.email = email;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

public class PhoneContact extends Contact {
    @Pattern(regexp = "\\d{3}-\\d{3}-\\d{3}",
             message = "invalid phone number")
    private String phoneNumber;

    public PhoneContact() { }
    public PhoneContact(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
{% endhighlight %}
Again we used `@Valid` annotation to tell Hibernate Validator to
validate all non null beans contained in `contacts` collection.
Now we may check if all `Person` contacts are valid:
{% highlight java %}
joe.setContacts(Arrays.asList(
    new EmailContact("joe@example.com"),
    new PhoneContact("123-123-123"),
    new EmailContact("invalid_email"),
    new PhoneContact("invali_phone")
));

validator.validate(joe);
// CONSTRAINT VIOLATIONS:
// contacts[3].phoneNumber |           invalid phone number  | is invali_phone
// contacts[2].email       | not a well-formed email address | is invalid_email
{% endhighlight %}

Unfortunately there is no build-in annotation that would protect
us from collections containing `null`s:
{% highlight java %}
joe.setContacts(Collections.singletonList(null));
assert validator.validate(joe).size() == 0;
{% endhighlight %}
To fix that problem we must write a custom constraint ourselves.

##### Customizing validation messages

The easiest way to customize validation message is to
set it explicitly via 
`message` parameter:
{% highlight java %}
@Range(min=1, max=200, 
    message = "person age must be between 1 and 200 years")
private int age;
{% endhighlight %}
This approach is inflexible and you should avoid it, instead
try to load validation messages from application resources.
Hibernate Validator by default will load validation messages from
`resources/ValidationMessages.properties` file.
We may use this file to either add new validation message or
customize existing:
{% highlight no-highlight %}
# Override existing message
org.hibernate.validator.constraints.Range.message=${validatedValue} is not in range (min: {min}, max: {max})

# Create new message
invalid_person_age=person age must be between 1 and 200 years 
{% endhighlight %}
Then we may use are new message:
{% highlight java %}
@Range(min=1, max=200, message = "{invalid_person_age}")
private int age;
{% endhighlight %}

#### Extending Hibernate Validator

##### Constraint composition

Earlier we used the following code to validate phone number:
{% highlight java %}
@Pattern(regexp = "\\d{3}-\\d{3}-\\d{3}",
         message = "invalid phone number")
private String phoneNumber;
{% endhighlight %}
We certainly don't want to repeat this annotation with regex expression and
message accross all codebase, that would violate 
[DRY principle](https://en.wikipedia.org/wiki/Don't_repeat_yourself).
On the other hand the following code validated person name:
{% highlight java %}
@NotNull
@Length(min=1)
private String name;
{% endhighlight %}
Here we see that to validate name we need two constraints, again
repeating two constraints in various DTO's is not a receipt for
a good code.

To solve above problems JSR 303 introduces constraint composition.
In short you create a new constraint annotation and put
on it all required constraints, you may also adjust
message, payload and/or groups to which constraint belongs.
For example we may create `ValidPhoneNumber` constraint:
{% highlight java %}
@Pattern(regexp = "\\d{3}-\\d{3}-\\d{3}")
@ReportAsSingleViolation
@Constraint(validatedBy = { })
@Target({ METHOD, FIELD, ANNOTATION_TYPE })
@Retention(RUNTIME)
@Documented
public @interface ValidPhoneNumber {
    String message() default "phone number should be in format 999-999-999";
    Class<?>[] groups() default { };
    Class<? extends Payload>[] payload() default { };
}
{% endhighlight %}
And then use it accross our codebase:
{% highlight java %}
public class PhoneContact extends Contact {
    @ValidPhoneNumber
    private String phoneNumber;
    //...
}
{% endhighlight %}
Not only this adheres to DRY princible but our code
is now more readable.

When we put multiple constraints on composed constraint:
{% highlight java %}
@NotNull
@Length(min=1)
@Target({ METHOD, FIELD, ANNOTATION_TYPE })
@Retention(RUNTIME)
@Constraint(validatedBy = { })
@Documented
// @ReportAsSingleViolation
public @interface ValidPersonName {
    String message() default "person must have a name";
    Class<?>[] groups() default { };
    Class<? extends Payload>[] payload() default { };
}
{% endhighlight %}
And then use it on a field:
{% highlight java %}
@ValidPersonName
private String name;
{% endhighlight %}
Each of composing constrains will be reported independently:
{% highlight java %}
Person joe = new Person();
joe.setName("");
//       name | length must be between 1 and 2147483647 | is     

joe.setName(null);
//       name |                may not be null | is       null
{% endhighlight %}
We may add `@ReportAsSingleViolation` annotation to our
composed constrain to report all violations as a single error.
With `@ReportAsSingleViolation` we get:
{% highlight java %}
Person joe = new Person();
joe.setName("");
//       name |        person must have a name | is       
joe.setName(null);
//       name |        person must have a name | is       null
{% endhighlight %}
Notice that this time message was taken from composed constraint.

##### Using payloads

We may use payloads to pass some additional informations
with validation errors. Canonical example of using payloads is
to differentiate between errors and warnings.

First we must define our payload values:
{% highlight java %}
import javax.validation.Payload;

public interface SEVERITY {
    interface WARNING extends Payload { }
    interface ERROR extends Payload { }
}
{% endhighlight %}
Then we may use them with constraints:
{% highlight java %}
import io.mc.validationdemo.constraints.SEVERITY.ERROR;
import io.mc.validationdemo.constraints.SEVERITY.WARNING;
import org.hibernate.validator.constraints.NotBlank;

public class SeverityDTO {
    @NotBlank(payload = ERROR.class)
    public String important;
    
    @NotBlank(payload = WARNING.class)
    public String unimportant;

    // ...
}
{% endhighlight %}
Finally we may use them to decide if given `ConstraintViolation`
is warning or error:
{% highlight java %}
public static boolean isWarning(ConstraintViolation<?> violation) {
    boolean isWarning = violation.getConstraintDescriptor()
            .getPayload()
            .contains(SEVERITY.WARNING.class);

    return isWarning;
}
{% endhighlight %}

I am certain that you will find some creative usages of payloads
in you application.

##### Creating new constraints

To demonstrate how to create a new constraint,
we will create `@NotContain` validation rule that
checks that `String` doesn't contains specified value.

We will start by creating annotation (here it is best
to follow example from [official documentation](https://docs.jboss.org/hibernate/stable/validator/reference/en-US/html_single/#validator-customconstraints-constraintannotation)):
{% highlight java %}
@Target({FIELD, METHOD, ANNOTATION_TYPE})
@Retention(RUNTIME)
@Documented
@Constraint(validatedBy = NotContainValidator.class)
public @interface NotContain {
    String message() default "{validation.NotContain}";
    Class<?>[] groups() default { };
    Class<? extends Payload>[] payload() default { };
    String value();

    @Target({ FIELD, METHOD, ANNOTATION_TYPE })
    @Retention(RUNTIME)
    @Documented
    @interface List {
        NotContain[] value();
    }
}
{% endhighlight %}
Then we must implement `NotContainValidator`:
{% highlight java %}
public class NotContainValidator 
    implements ConstraintValidator<NotContain, String>
{
    private String bannedPhrase;
    public void initialize(NotContain constraintAnnotation) {
        bannedPhrase = constraintAnnotation.value();
    }

    public boolean isValid(String value, ConstraintValidatorContext context) {
        boolean isValid =
            value == null || !value.contains(bannedPhrase);
        return isValid;
    }
}
{% endhighlight %}
Then we should define our validation message
in `resources/ValidationMessages.properties` file, and we are done:
{% highlight java %}
public class Person {
    @ValidPersonName
    @NotContain("f**k")
    private String name;
    // ...
}

Person joe = new Person();
joe.setName("f**k");

validator.validate(joe);
// VIOLATED CONSTRAINTS:
// name | Property should not contain f**k | is       f**k
{% endhighlight %}

##### Value unwrappers

Sometimes we want to validate value that is contained in some other
type. For example we may want to validate a `String` contained
in `Optional<String>`.
This is possible in Hibernate Validator thanks to value unwrappers.

Hibernate Validator out of the box supports `Optional<T>` type, so
for a sake of example we will create our own "wrapper" type:
{% highlight java %}
public class Box<T> {
    private T value;

    public T getValue() {
        return value;
    }
    public void setValue(T value) {
        this.value = value;
    }
}
{% endhighlight %}
Now we may use our wapper type in DTOs:
{% highlight java %}
public class UnwrappingDTO {
    @Length(min=3,max=10)
    private Box<String> name;

    @Min(1)
    private Box<Long> age;

    // getters, setters 
}
{% endhighlight %}
If we try to validate `UnwrappingDTO` instance we will get
an exception:
{% highlight no-highlight %}
javax.validation.UnexpectedTypeException: HV000030: 
    No validator could be found for constraint 'Length' 
    validating type 'Box<String>'.
{% endhighlight %}
To make validation work again we must create are
own type unwrapper:
{% highlight java %}
public class BoxUnwrapper extends ValidatedValueUnwrapper<Box<?>> {
    @Override
    public Object handleValidatedValue(Box<?> property) {
        return property.getValue();
    }

    @Override
    public Type getValidatedValueType(Type type) {
        // return generic parameter T of Box<T>
        Class<?> clazz = (Class<?>)
                ((ParameterizedType)type).getActualTypeArguments()[0];

        return clazz;
    }
}
{% endhighlight %}
And register it in Hibernate Validatior framework:
{% highlight java %}
Validator validator = Validation.byProvider(HibernateValidator.class)
        .configure()
        .addValidatedValueHandler(new BoxUnwrapper())
        .buildValidatorFactory()
        .getValidator();
{% endhighlight %}
The last thing that we should do, is to annotate `Box<T>` properties with
`@UnwrapValidatedValue`:
{% highlight java %}
@Length(min=3,max=10)
@UnwrapValidatedValue
private Box<String> name;

@Min(1)
@UnwrapValidatedValue
private Box<Long> age;
{% endhighlight %}
And now we can validate `Box`ed values, yay!

##### Integrating Hibernate Validator with Spring DI

This section shows how to quickly integrate Hibernate Validator
with Spring. This is not the offical way of how you should integrate
with DI, just a quick and dirty solution that you may find helpful.
You have been warned. Also remember that Spring provides it's
own validation framework, fully complaint with JSR 303 and called
[Spring Validation](http://docs.spring.io/spring/docs/current/spring-framework-reference/html/validation.html#validation-beanvalidation).

First we must create validator factory and register it in Spring
and in Hibernate Validator framework:
{% highlight java %}
@Component
public class SpringConstrainValidationFactory 
implements ConstraintValidatorFactory {
    @Autowired
    private ApplicationContext context;

    @Override
    public <T extends ConstraintValidator<?, ?>> T getInstance(Class<T> key) {
        if (key.getPackage().getName().startsWith("javax.validation") ||
            key.getPackage().getName().startsWith("org.hibernate.validator"))
        {
            try {
                // create standard validators by calling
                // default constructor
                return key.newInstance();
            } catch (Exception ex) {
                throw new RuntimeException(ex);
            }
        }

        // Use Spring to create validator bean
        return context.getBean(key);
    }

    @Override
    public void releaseInstance(ConstraintValidator<?, ?> instance) {
        // DO NOTHING
    }
}
{% endhighlight %}
And in application configuration we should have:
{% highlight java %}
@Configuration
@ComponentScan("your.package.name")
public class AppConfig {
    @Bean
    public Validator getHibernateValidator(
        SpringConstrainValidationFactory factory)
    {
       Validator validatorEx = Validation.byProvider(HibernateValidator.class)
                .configure()
                .addValidatedValueHandler(new BoxUnwrapper())
                // register Spring based validator factory
                .constraintValidatorFactory(factory)
                .buildValidatorFactory()
                .getValidator();

       return validatorEx;
    }
}
{% endhighlight %}
Also do not forget to mark validators as `@Component`, now we may
use dependency injection inside validators.


