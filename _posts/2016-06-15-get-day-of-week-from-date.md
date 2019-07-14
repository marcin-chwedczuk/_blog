---
author: mc
layout: post
cover: 'assets/images/cover7.jpg'
title: Get day of week from date
date:   2016-06-15 00:00:00
tags: java algorithms
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Today we will try to solve the following problem:

> Given year, month and day tell what day of week it is (Sunday, Monday etc.).
>
> INPUT: Three numbers `year`, `month` and `day` representing valid date.
> `year` must be `> 0`, months and days are numbered from 1.
> For example 3 January 2016 will be represented by `year = 2016`, `month = 1` and `day = 3`.
>
> OUTPUT: A single number that represents day of week, we assume that `0` will represent
> Sunday, `1` Monday, `2` Tuesday, ..., `6` Saturday.

We will start by solving simpler problem:

> Assume that you know what day of week is 31th December of previous year.
> Given day and month in current year tell what day of week it is.

Formula to solve this problem is simple:
{% highlight no-highlight %}
day_of_week = (
        day_of_week_31_dec_prev_year + 
        number_of_days_since_year_start(month, day)
        ) % 7
{% endhighlight %}
Only tricky part is that `number_of_days_since_year_start(month, day)` must take into
account leap years.

Testing for [leap years is easy](https://en.wikipedia.org/wiki/Leap_year#Algorithm):
{% highlight java %}
boolean isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}
{% endhighlight %}

Now we can write `number_of_days_since_year_start` function:
{% highlight java %}
int numberOfDaysSinceYearStart(int year, int month, int day) {
    // (1) number of days in months: 
    // [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        
    // days[month-1] - number of days in year 
    //                 before month first day.
    //
    // This can be computed using (1). 
    // We don't take into account leap years.
    int[] days = { 0, 31, 59, 90, 120, 151, 
                   181, 212, 243, 273, 304, 334 };
        
    int result = days[month-1] + day;

    if (month > 2) {
        // add February 29th for leap years
        result += isLeap(year) ? 1 : 0;
    }

    return result;
}
{% endhighlight %}
And finally we may implement `day_of_week` function:
{% highlight java %}
int dayOfWeek(
    int dayOfWeek31DecPrevYear, 
    int year, int month, int day)
{
    return (
        dayOfWeek31DecPrevYear +
        numberOfDaysSinceYearStart(year, month, day)
    ) % 7;
}
{% endhighlight %}
Let's test it:
{% highlight java %}
// 31 December 2015 is Thursday (= 4)
> dayOfWeek(4, 2016, 6, 15)
3 // Wednesday OK
> dayOfWeek(4, 2016, 9, 13) 
2 // Tuesday OK
{% endhighlight %}
Looks like it works, so now we may return to our original problem.

Let's start with 
[this Wikipedia article](https://en.wikipedia.org/wiki/Determination_of_the_day_of_the_week)
which tell us that 1 January 0001 is a Monday. But for us it will be more convenient to count days
not from 1 January of given year but from 31 December of the previous year. 
It is interesting that
there is no year 0000, year that precedes year 0001 or 1 AD is 1 BC (or in other words
years are intervals not points). To sum up we start counting days
from 31 December 1 BC.

We already have function that returns day of week if we know day of week of 31 December 
of the previous year. We can find out day of week of any date using formula:
{% highlight no-highlight %}
day_of_week_31_dec_1bc = 0; // Sunday

day_of_week_31_dec_prev_year = (
        day_of_week_31_dec_1bc +
        number_of_days_in_years(year-1)
) % 7;

day_of_week = dayOfWeek(
        day_of_week_31_dec_prev_year,
        year, month, day);
{% endhighlight %}

Let's start by implementing `number_of_days_in_years(year)` function that will return
number of days since 31 December 1 BC up to 31 December of given `year`:
{% highlight java %}
int numberOfDaysInYears(int year) {
    int normalDays = 365 * year;

    // number of leap years = number of leap days
    int leapDays = year/4 - year/100 + year/400;

    return normalDays+leapDays;
}
{% endhighlight %}
To count number of leap years I used [inclusion-exclusion principle](https://en.wikipedia.org/wiki/Inclusion–exclusion_principle).

And finally we may implement our `day_of_week` routine:
{% highlight java %}
int dayOfWeek(int year, int month, int day) {
    int dayOfWeek31Dec1BC = 0; // Sunday

    int dayOfWeek31DecPrevYear = (
            dayOfWeek31Dec1BC +
            numberOfDaysInYears(year-1)
    ) % 7;

    int result = dayOfWeek(
            dayOfWeek31DecPrevYear,
            year, month, day);

    return result;
}
{% endhighlight %}
Now we may test it but we must be careful here. Our routine returns day of week
using Gregorian calendar that was introduced in 1582 AD (or later depending on country). 
If we want to test it
in Java we should avoid using `GregorianCalendar` class since it will switch to
Julian calendar mode for years before 1582 AD. More informations on this
subject can be found in this [Stackoverflow question](http://stackoverflow.com/questions/23975205/why-does-converting-java-dates-before-1582-to-localdate-with-instant-give-a-diff).
To avoid problems we will use `LocalDate` class
that always uses Gregorian calendar:
{% highlight java %}
Random r = new Random();
int[] days = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

for (int i = 0; i < 1000; i++) {
    int year = 1 + r.nextInt(13000);

    for (int m = 1; m <= 12; m++) {
        for (int d = 1; d <= days[m-1]; d++) {
            int actual = dayOfWeek(year, m, d);
            int expected = LocalDate.of(year, m, d)
                        .getDayOfWeek()
                        .getValue() % 7;

            if (actual != expected)
                throw new RuntimeException(String.format(
                        "failed for yyyy-mm-dd: %d-%d-%d, " + 
                        "expected: %d, actual: %d.",
                        year, m, d, expected, actual));
        }
    }
}
{% endhighlight %}
Our curde testing function returns without throwing any exceptions, so we may
rest assured that our function works.

#### Tomohiko Sakamoto algorithm

Before we end this post let's challenge ourselves one more time.
Here is Tomohiko Sakamoto algorithm for computing day of week:
{% highlight java %}
int dayOfWeek2(int y, int m, int d)
{
    int t[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
    y -= (m < 3) ? 1 : 0;
    return (y + y/4 - y/100 + y/400 + t[m-1] + d) % 7;
}
{% endhighlight %}
With our newly gained knowledge about computing day of week let's find out
how it works!

The main idea behind the algorithm is to compute day of week from 31 December of the previous
year for January and February (just as we do in our algorithm) and to compute day of week
for all other months from 31 December of the **current** year. This greatly simplifies dealing
with leap years.
![Computing day of week from beginning or from ending of the year](assets/images/2016-06-15/compute_from.svg)

To compute day of week from year end we will do as follows: say we want to know day of week
for 7 April 2016. We know that 31 December 2016 is Saturday. Next we must get day of week
for last day of month that precedes April, in other words we must find out day of week for 31 March
(that's Thursday).
Then we just add days and take rest modulo seven and we are done: 7 April is Thursday too. 
This is illustrated on image below:
![Computing day of week backwards example](assets/images/2016-06-15/backwards.svg)

To compute day of week for last day of prev month we will use formula:
{% highlight no-highlight %}
// DOW = day of week
dow_last_day_of_prev_month = (
    dow_last_day_of_year - 
    number_of_days_from_prev_month_last_day_to_end_of_year
    ) % 7;
{% endhighlight %}
Notice that we are *subtracting* two values modulo seven to move backwards.
Unfortunately in Java modulo can return negative values when used with negative numbers e.g.
{% highlight Java %}
> -32 % 7
-4
{% endhighlight %}
To solve this problem we will use simple fact from
[modular arithmetic](https://en.wikipedia.org/wiki/Modular_arithmetic):
{% highlight no-highlight %}
(a - b) % 7 = (a + (7 - (b%7))) % 7
notice that (7 - (b%7)) cannot be negative 
because 0 <= (b%7) < 7
    
for example:
(5 - 3) % 7 = 2 % 7 = 2
(5 + (7 - (3%7)) % 7 = (5 + (7 - 3)) % 7 =
        = (5 + 4) % 7 = 9 % 7 = 2
{% endhighlight %}
Now we will be guaranteed to get a number that represents valid day of week.

Full algorithm looks like this:
{% highlight Java %}
int dayOfWeekBackwards(
        int dayOfWeek31DecCurrYear, int year, int month, int day) 
{
// number of days from last day of previous month to the year end
// int[] daysToEndOfTheYear = 
//    { 365, 334, 306, 275, 245, 214, 184, 153, 122, 92, 61, 31 };

    // notice: we use our modulo formula here
    // days[i] = 7-(daysToTheEndOfTheYear[i]%7)
    // thanks to this we may write later
    // (lastDay + days[i]) % 7 instead of
    // (lastDay - daysToEndOfTheYear[i]) % 7
    int[] days = { 6, 2, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4 };
    int delta = days[month-1];

    if (month <= 2) {
        // for leap years in Jan or Feb
        // there is one more day to year end

        // again we add to avoid subtraction
        // (x - 1) % 7 == (x + 6) % 7
        delta += isLeap(year) ? 6 : 0;
    }
    
    int dayOfWeekLastDayPrevMonth = 
        (dayOfWeek31DecCurrYear + delta) % 7;

    return (dayOfWeekLastDayPrevMonth + day) % 7;
}
{% endhighlight %}

Now we can combine our forward and backward approaches to create one simple algorithm:
{% highlight Java %}
int dayOfWeekComb(int y, int m, int d) {
    int dayOfWeekDec31 = (m <= 2)
            // count from prev year
            ? numberOfDaysInYears(y-1)
            // count from end of curr year
            : numberOfDaysInYears(y);

    // number of days -> day of week
    dayOfWeekDec31 = dayOfWeekDec31 % 7;

    // 0,31 - comes from our first algorithm
    // rest of values comes from backward algorithm
    int[] days = { 0, 31,  2, 5, 0, 3, 5, 1, 4, 6, 2, 4 };

    int dayOfWeekPrevMonthLastDay = 
        (dayOfWeekDec31 + days[m-1]) % 7;

    return (dayOfWeekPrevMonthLastDay + d) % 7;
}
{% endhighlight %}
Before we end let's try to use refactoring to simplify code further.
Let's start with statement:
{% highlight java %}
int dayOfWeekDec31 = (m <= 2)
        // count from prev year
        ? numberOfDaysInYears(y-1)
        // count from end of curr year
        : numberOfDaysInYears(y);
{% endhighlight %}
Since this is the only place that use `y` we can refactor this code into:
{% highlight java %}
y -= (m <= 2) ? 1 : 0;
int dayOfWeekDec31 = numberOfDaysInYears(y);
{% endhighlight %}
Then we can inline `numberOfDaysInYears` function:
{% highlight java %}
y -= (m <= 2) ? 1 : 0;
int dayOfWeekDec31 = 365*y + y/4 - y/100 + y/400;

dayOfWeekDec31 = dayOfWeekDec31 % 7;
{% endhighlight %}
Next since `365*y % 7 == 1*y % 7` and `(a + b) % 7 == (a % 7 + b % 7) % 7` we can
simplify further:
{% highlight java %}
int dayOfWeekComb(int y, int m, int d) {
    y -= (m <= 2) ? 1 : 0;
    int dayOfWeekDec31 = (y + y/4 - y/100 + y/400) % 7;

    int[] days = { 0, 31,  2, 5, 0, 3, 5, 1, 4, 6, 2, 4 };

    int dayOfWeekPrevMonthLastDay = 
        (dayOfWeekDec31 + days[m-1]) % 7;

    return (dayOfWeekPrevMonthLastDay + d) % 7;
}
{% endhighlight %}
Finally because `31 % 7 == 3`, and combining all additions into single expression we get:
{% highlight java %}
int dayOfWeekComb(int y, int m, int d) {
    int[] days = { 0, 3,  2, 5, 0, 3, 5, 1, 4, 6, 2, 4 };

    y -= (m <= 2) ? 1 : 0;
    return (y + y/4 - y/100 + y/400 + days[m-1] + d) % 7;
}
{% endhighlight %}
which is exactly Tomohiko Sakamoto algorithm.

Wow! This post turned out to be rather lengthy, 
if you are still with me thank you for your effort and hard work!

