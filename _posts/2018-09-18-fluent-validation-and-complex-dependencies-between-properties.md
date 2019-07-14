---
author: mc
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: Fluent Validation and complex dependencies between properties
date: 2018-09-18 00:00:00
tags: dotnet unit-testing
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---
[FluentValidation](https://fluentvalidation.net/) is one of the
best validation libraries for .NET. I use it daily both at work
and in my personal pet projects. Still from time to time I
encounter situations where it is not obvious how 
I should use FluentValidation.
In this blog post I describe one such situation that I have to
deal with recently.

In short I had to validate a simple DTO:
{% highlight csharp %}
public class SampleRequestDto {
    public AddressDto Address { get; set; }
    public ContactInfoDto ContactInfo { get; set; }
}

public class AddressDto {
    public string AddressLine1 { get; set; }
    public string AddressLine2 { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
    public string CountryIsoCode { get; set; }
}

public class ContactInfoDto {
    public string EmailAddress { get; set; }
    // Phone number validation depends on CountryIsoCode.
    public string PhoneNumber { get; set; }
}
{% endhighlight %}
With a small twist that `ContactInfo.PhoneNumber` was 
validated using country dependent format and information
about country itself was stored in `Address.CountryIsoCode` field.

This is generally a good use-case for FluentValidation `Custom` rule:
{% highlight csharp %}
RuleFor(x => x)
    .Custom((dto, context) => {
        var countryIsoCode = dto?.Address?.CountryIsoCode;
        if (string.IsNullOrEmpty(countryIsoCode)) 
            return;

        var country = Countries.FindCountryByIsoCode(countryIsoCode);
        // invalid country code - cannot validate phone number
        if (country == null)
            return;

        var phoneNumber = dto?.ContactInfo?.PhoneNumber;
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return;

        if (!country.PhoneNumberFormat.Matches(phoneNumber)) {
            context.AddFailure(new ValidationFailure(
                $"ContactInfo.PhoneNumber", // property name
                $"'{phoneNumber}' is not a valid phone number in {country.Name}."));
        }
    });

{% endhighlight %}
Unfortunately in my case I also had a bunch of other country dependent 
values like VAT numbers scattered across many DTOs. And I needed
a more reusable and programmer friendly solution than `Custom` rule.

Ideally my validator definition should look like this:
{% highlight csharp %}
public class SampleRequestDtoValidator : AbstractValidator<SampleRequestDto> {
    public  SampleRequestDtoValidator() {
        RuleFor(x => x.Address)
            .SetValidator(new AddressDtoValidator());

        RuleFor(x => x.ContactInfo)
            .SetValidator(new ContactInfoDtoValidator());
    }
}

public class AddressDtoValidator : AbstractValidator<AddressDto> {
    public AddressDtoValidator() {
        RuleFor(x => x.CountryIsoCode)
            .NotEmpty()
            .CountryIsoCode(); // custom extension
        // other rules...
    }
}

public class ContactInfoDtoValidator : AbstractValidator<ContactInfoDto> {
    public ContactInfoDtoValidator() {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty()
            .MaximumLength(50)
            .PhoneNumber(); // custom extension
        // other rules...
    }
}
{% endhighlight %}
Creating property validators like `CountryIsoCode` using FluentValidation
is very simple. You just extend `PropertyValidator` class,
provide an error message template to the base class ctor and override
`IsValid` method. 
Additionally you may define an extension method 
to the `IRuleBuilder<T,TProperty>`
interface to make your validator behave like build-in ones.
{% highlight csharp %}
public class CountryIsoCodeValidator : PropertyValidator {
    public CountryIsoCodeValidator() 
        : base("'{PropertyValue}' is not a valid country iso code.") { }

    protected override bool IsValid(PropertyValidatorContext context) {
        var isoCode = (string) context.PropertyValue;

        if (string.IsNullOrEmpty(isoCode)) {
            return true;
        }

        return Countries.IsKnownIsoCode(isoCode);
    }
}

public static class CountryIsoCodeValidatorExtension {
    public static IRuleBuilderOptions<T, string> CountryIsoCode<T>(
        this IRuleBuilder<T, string> rule
    ) {
        return rule.SetValidator(new CountryIsoCodeValidator());
    }
}
{% endhighlight %}

`CountryCode` validator was easy, what about `PhoneNumber` validator?
Here the only challenge that we must solve 
is finding a way to pass country ISO code from `Address` to 
phone number validator.
To solve this problem I decided to use "advanced" FluentValidation
feature called "Root Context Data". Basically this is a 
`IDictionary<string, object>` that can be prefilled with custom data
before validation starts and then is accessible to every validator
in validators tree.

Let's take a look at an example from 
[official documentation](https://fluentvalidation.net/start#root-context-data):
{% highlight csharp %}
var instanceToValidate = new Person();

var context = new ValidationContext<Person>(person);
context.RootContextData["MyCustomData"] = "Test";

var validator = new PersonValidator();
validator.Validate(context);

// usage inside validator:
RuleFor(x => x.Surname).Custom((x, context) => {
  if(context.ParentContext.RootContextData.ContainsKey("MyCustomData")) {
    context.AddFailure("My error message");
  }
});
{% endhighlight %}
Looks very promising, and what's better we can add values to `RootContextData`
straight inside top-level validators by overriding `PreValidate` method:
{% highlight csharp %}
public class SampleRequestDtoValidator : AbstractValidator<SampleRequestDto> {
    public  SampleRequestDtoValidator() {
        RuleFor(x => x.Address)
            .SetValidator(new AddressDtoValidator());

        RuleFor(x => x.ContactInfo)
            .SetValidator(new ContactInfoDtoValidator());
    }

    protected override bool PreValidate(
        ValidationContext<SampleRequestDto> context, ValidationResult result) 
    {
        var contextData = new ValidationContextData(
            context.RootContextData);

        contextData.CountryIsoCode = 
            context.InstanceToValidate?.Address?.CountryIsoCode;

        return true; // continue validation
    }
}
{% endhighlight %}
To avoid dealing with `object`s I have also created a strongly typed
wrapper (`ValidationContextData` class) around `RootContextData`
dictionary.

IMPORTANT: To make validators reusable you should set `RootContextData` only
in top level validators. Validators used with `SetValidator`
method are not considered top level.

Now implementing `PhoneNumberValidator` is easy:
{% highlight csharp %}
public class PhoneNumberValidator : PropertyValidator {
    public PhoneNumberValidator() 
        : base("'{PropertyValue}' is not a valid phone number in {Country}.") { }

    protected override bool IsValid(PropertyValidatorContext context) {
        var phoneNumber = (string) context.PropertyValue;
        if (string.IsNullOrEmpty(phoneNumber)) {
            return true;
        }

        var contextData = new ValidationContextData(
            context.ParentContext.RootContextData);

        var country = TryFindCountry(contextData.CountryIsoCode);
        if (country == null) {
            // without a country we cannot validate a phone number
            return true;
        }

        context.MessageFormatter.AppendArgument("Country", country.Name);

        return country.PhoneNumberFormat.Matches(phoneNumber);
    }

    private Country TryFindCountry(string countryIsoCode) {
        if (string.IsNullOrEmpty(countryIsoCode)) {
            return null;
        }

        return Countries.FindCountryByIsoCode(countryIsoCode);
    }
}

public static class PhoneNumberValidatorExtension {
    public static IRuleBuilderOptions<T, string> PhoneNumber<T>(
        this IRuleBuilder<T, string> rule
    ) {
        return rule.SetValidator(new PhoneNumberValidator());
    }
}
{% endhighlight %}
And we are done!

#### Unit-testing validators

FluentValidation provides several extension methods that
make unit-testing easy, just take a look:
{% highlight csharp %}
using FluentValidation.TestHelper;

public class SampleRequestDtoValidatorTest {
    private readonly SampleRequestDtoValidator _validator;

    public SampleRequestDtoValidatorTest() {
        _validator = new SampleRequestDtoValidator();
    }

    [Fact]
    public void Should_return_error_when_phone_number_is_invalid_and_countryIsoCode_is_set() {
        // Arrange
        var invalidRequest = 
            SampleRequestDtoFixture.CreateValidRequest();
        invalidRequest.Address.CountryIsoCode = "PL";
        invalidRequest.ContactInfo.PhoneNumber = "+48 123";

        // Assert
        _validator
            .ShouldHaveValidationErrorFor(
                x => x.ContactInfo.PhoneNumber, invalidRequest)
            .WithErrorMessage(
                "'+48 123' is not a valid phone number in Poland.");
    }
}
{% endhighlight %}

#### Design considerations

Everything works right now, but there is still place for improvement.
For example what happens when a programmer forgets to
override `PreValidate` method and set all required properties?
Validation of certain properties will be silently skipped.
This is not good.
To minimize this problem I put additional checks inside `ValidationContextData`
class. They will throw an exception with a descriptive message if
validator tries to access a property that was not previously set.

In my application values like phone numbers are always validated against
country specific formats. But I can imaging situations where
sometimes we use country agnostic phone number validator and
sometimes 
we use country specific one. In such cases it would be good
to call the country agnostic validator just a `PhoneNumberValidator` and
the country specific validator a `CountryDependentPhoneNumberValidator`.

I have a mixed feelings about `ValidationContextData` class because
it is used by every country specific validator in my code. Maybe 
instead of introducing this common dependency every validator should
access `RootContextData` and check if the property is set itself?

Sample source code: [GitHub](https://github.com/marcin-chwedczuk/blog-fluent-validation-adventure).

