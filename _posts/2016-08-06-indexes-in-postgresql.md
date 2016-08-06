---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Indexes in PostgreSQL database
date:   2016-08-06 00:00:00
tags: vim 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this article I will present how to use indexes in PostgreSQL database.

We will need test database for exercises so let's create one:
{% highlight sql %}
create database index_demo;
{% endhighlight %}
Inside `index_demo` database we should create three tables:
{% highlight sql %}
create table account
(
    account_id serial primary key, 
    email text, 
    first_name text, 
    last_name text, 
    is_active boolean
);

create table first_name 
(
    id serial primary key,
    first_name text
);

create table last_name
(
    id serial primary key,
    last_name text
);
{% endhighlight %}
`account` table will be used in exercises, `first_name` and `last_name` tables
will be needed to load test data.

To populate `account` table we will use [freely available database of
most popular first names and last names](http://www.quietaffiliate.com/free-first-name-and-last-name-databases-csv-and-sql/).
Please download [first_name.csv](assets/data/2016-08-06/first_name.csv) and
[last_name.csv](assets/data/2016-08-06/last_name.csv) files.

We will use SQL `copy` command to load data from CSV files into `first_name` and `last_name`
tables:
{% highlight sql %}
copy first_name(first_name) 
from '/path_to/first_name.csv' 
with csv delimiter ',';

copy last_name(last_name) 
from '/path_to/last_name.csv' 
with csv delimiter ',';
{% endhighlight %}
This command must be run from PostgreSQL account that was created with `superuser` option.
You may check if your current account is `superuser` by executing query:
{% highlight sql %}
show is_superuser;
-- if you get '1', 'on' or 'yes' then you are a superuser
{% endhighlight %}
On Ubuntu you can create `superuser` account using command:
{% highlight no-highlight %}
$ sudo -u postgres psql -c "create role super_user with login superuser password '1234'"
{% endhighlight %}

After loading data from CSV files you should have a bunch of first and last names in
`first_name` and `last_name` tables:
{% highlight sql %}
select count(*) from first_name;
-- 5164
select count(*) from last_name;
-- 88798
{% endhighlight %}
Now we may use data from `first_name` and `last_name` to populate `account` table:
{% highlight sql %}
insert into account(email, first_name, last_name, is_active)
select 
    -- create email by joining first letter of first name, dot and last name
    lower(substring(F.first_name from 1 for 1)||'.'||L.last_name||'@example.com') as email,
    F.first_name as first_name,
    L.last_name  as last_name,
    true as is_active
from (
    select 
        last_name,
        -- select random number from 1 to count_of_first_names
        ceil(random() * (select count(*) from first_name)) as first_name_index
    from last_name
) L
inner join (
    select 
        first_name, 
        -- number first names from 1 to count_of_first_names
        row_number() over () as index
    from first_name
) F on F.index = L.first_name_index
-- we join on first_name_index, so each last_name will get random first_name
{% endhighlight %}
After executing this query `account` table will contain test data:
![Data in account table](assets/images/2016-08-06/account_data.png)

#### Unique Indexes

Often we want to enforce uniqueness of values in given table column.
For example each user should have unique login, there should be
only one person with given national id etc.
Databases allow us to implement such a constraint via unique index.

We will add unique index to `account` table to
ensure that each account email is unique:
{% highlight sql %}
-- udx_account_email is index name
create unique index udx_account_email on account(email)
{% endhighlight %}
If in the future we decide that after all emails may repeat, we may
drop (remove) index using:
{% highlight sql %}
drop index udx_account_email;
{% endhighlight %}

Let's check how it works:
{% highlight sql %}
insert into account(email, first_name, last_name, is_active)
values ('j.doe@example.com', 'jon', 'doe', true)
-- OK

insert into account(email, first_name, last_name, is_active)
values ('j.doe@example.com', 'joseph', 'doe', true)
-- ERROR:  duplicate key value violates unique constraint "udx_account_email"
-- DETAIL:  Key (email)=(j.doe@example.com) already exists.

insert into account(email, first_name, last_name, is_active)
values ('J.doe@example.com', 'joseph', 'doe', true)
-- OK
{% endhighlight %}
Looks like our index works, but uses case sensitive check to compare two emails.
It would be better to ignore case when performing check, we may achieve this by using
`lower` function (converts strings to lower case) in our index definition:
{% highlight sql %}
drop index udx_account_email;
create unique index udx_account_email on account(lower(email));
{% endhighlight %}
Now index will check if `lower(email)` value is unique across table:
{% highlight sql %}
delete from account where last_name like 'doe';

insert into account(email, first_name, last_name, is_active)
values ('j.doe@example.com', 'joe', 'doe', true);
-- OK

insert into account(email, first_name, last_name, is_active)
values ('J.doe@example.com', 'joseph', 'doe', true)
-- ERROR:  duplicate key value violates unique constraint "udx_account_email"
-- DETAIL:  Key (lower(email))=(j.doe@example.com) already exists.
{% endhighlight %}

#### Standard Indexes

In databases indexes are mainly used to speed up queries.
By keeping additional information database can retrieve values more
quickly.
The following example will illustrate that:
{% highlight sql %}
explain select * 
from account
where first_name like 'Michael'

-- Seq Scan on account  (cost=0.00..1907.98 rows=17 width=39)
--   Filter: (first_name ~~ 'Michael'::text)
{% endhighlight %}
We can use `explain` to ask database how it will execute query.
In our example since we don't have any index on `first_name` column
database will read every row in the table (that's what Seq Scan mean)
and then check if `fist_name` is equal to `Michael`. If our table
would contain millions of rows this would be really slow.
To speed things up we may add index on `first_name` column 
that will keep track where rows with given `first_name` are stored:
{% highlight sql %}
create index idx_account_first_name on account(first_name);

explain select * 
from account
where first_name like 'Michael'

-- Index Scan using idx_account_first_name on account  (cost=0.29..8.63 rows=17 width=39)
--  Index Cond: (first_name = 'Michael'::text)
--  Filter: (first_name ~~ 'Michael'::text)
{% endhighlight %}
Now we can see that database will use index to perform search (Index Scan).
When we look at `cost` returned by explain we can see that
now it's equal to `0.29 - 8.63`, and without index it was equal to `0 - 1907.98`. 
This means that we should expect x200 performance improvement especially
with more rows in account table.

Indexes are great way to speed queries up but they come with a cost, database must
update index every time you insert a new row into table or update existing one.
Adding too many indexes to table may actually slow things down, be warned.

#### Multicolumn Indexes

PostgreSQL allows us to define index on multiple columns.
For example let's say that we want to speed up query that filters
accounts by first name and last name:
{% highlight sql %}
-- we use analyze option here to get total query running time

explain analyze select * 
from account
where first_name like 'Heber' and first_name like 'Michael'

-- Index Scan using idx_account_first_name on account  (cost=0.29..8.32 rows=1 width=39) (actual time=0.001..0.001 rows=0 loops=1)
--  Index Cond: ((first_name = 'Heber'::text) AND (first_name = 'Michael'::text))
--  Filter: ((first_name ~~ 'Heber'::text) AND (first_name ~~ 'Michael'::text))
-- Total runtime: 0.017 ms
{% endhighlight %}
As we can see this query uses `idx_account_first_name` index that we created in
previous section and has quite good performance already.
But we can do even better by creating index on `first_name` and `last_name` column:
{% highlight sql %}
drop index idx_account_first_name;

create index idx_acount_first_name_last_name 
    on account(first_name, last_name)
{% endhighlight %}
Now we get:
{% highlight sql %}
explain analyze select * 
from account
where last_name like 'Heber' and first_name like 'Michael'

-- Index Scan using idx_acount_first_name_last_name on account  (cost=0.42..8.44 rows=1 width=39) (actual time=0.001..0.001 rows=0 loops=1)
--  Index Cond: ((first_name = 'Heber'::text) AND (first_name = 'Michael'::text))
--  Filter: ((first_name ~~ 'Heber'::text) AND (first_name ~~ 'Michael'::text))
-- Total runtime: 0.013 ms
{% endhighlight %}
We didn't gain much in this example (running time 0.017 ms vs 0.013 ms) 
but it's worth to know that
multicolumn indexes are available in PostgreSQL.

If we define index on columns `col1, ..., colN` PostgreSQL can use it
to optimize queries that test for equality/inequality for columns `col1 ... colK` and
that use comparisons (equal, greater then, less than etc.) on `col(K+1)`.
In other words our multicolumn index will be used to optimize queries:
{% highlight sql %}
-- we test first index column for equality
select * 
from account
where first_name like 'Michael';

-- we test first index column for equality
-- and perform comparison on second index column:
-- last_name must be greater than 'A' and less than 'B' (in lexicographic order)
select * 
from account
where first_name like 'Michael' and last_name like 'A%'
{% endhighlight %}
But our index cannot be used to optimise query:
{% highlight sql %}
-- first_name is not used in where, index can be only used
-- when we test for equality/inequality on first_name and
-- perform some additional test on last_name
select * 
from account
where last_name like 'Heber'
{% endhighlight %}

The last thing to remember is that multicolumn indexes can take up a lot of space
on disk. We can get size of all indexes for given table via query:
{% highlight sql %}
select pg_size_pretty(pg_indexes_size('account'));
-- 4896 kB

-- while using single column index on first_name:
select pg_size_pretty(pg_indexes_size('account'));
-- 4040 kB
{% endhighlight %}

#### Partial Indexes

Sometime we want to index only part of the table rows. In our example we may
want to index `email`s of only active users.
To support such scenarios PostgreSQL provides partial indexes.
For example:
{% highlight sql %}
-- you must use where clause to specify 
-- which rows should be included in index

create index idx_email_active_account on account(email)
        where is_active;
{% endhighlight %}
After index creation database will use index to speed up queries like:
{% highlight sql %}
-- we search only active accounts
select * 
from account
where email like 'foo' and is_active = true
{% endhighlight %}
But will use SeqScan to perform queries:
{% highlight sql %}
-- we may want to include not active accounts
select * 
from account
where email like 'foo'
{% endhighlight %}

#### The End
That's all for today, thanks for reading. 

If you have any suggestion how I can improve this blog please
leave a comment!
