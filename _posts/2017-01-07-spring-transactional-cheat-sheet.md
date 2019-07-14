---
author: mc
layout: post
cover: 'assets/images/mc_cover9.jpeg'
title: Spring @Transactional cheat sheet
date: 2017-01-07 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

#### @Transactional(propagation=...)

`MANDATORY`
: Method must run within transaction. If there is no
currently active transaction going on an exception is thrown.

`REQUIRED`
: Method must run within transaction. If there is already started
transaction method will run within that transaction, otherwise
new transaction will be started.

`REQUIRES_NEW`
: Method must run within it's own transaction. Spring will
always create a new transaction for this method. If there is
already started transaction going on, it will be suspended for
duration of this method.

`NESTED`
: Method will be run within nested transaction. If no transaction is
present new transaction will be started, otherwise a nested transaction
will be started.

`NOT_SUPPORTED`
: Method should not run within transaction. If there is active transaction
going on it will be suspended for duration of this method call.

`NEVER`
: Method should not run within transaction.
An exception will be thrown if method is called and
there is active transaction going on.

#### @Transactional(isolation=...)

| Isolation Level | Dirty Reads | Nonrepeatable reads | Phantom reads |
| --------------- | :---------: | :-----------------: | :-----------: |
| `READ_UNCOMMITTED` | :x: | :x: | :x: |
| `READ_COMMITTED` | :heavy_check_mark: | :x: | :x: |
| `REPEATABLE_READ` | :heavy_check_mark: | :heavy_check_mark: | :x: |
| `SERIALIZABLE` | :heavy_check_mark: |:heavy_check_mark:|:heavy_check_mark: |

`DEFAULT` isolation level uses transaction isolation level provided
by underlying implementation.

Dirty Reads
: Transaction may read data written
but not yet committed by other transactions.

Nonrepeatable
reads
: Performing the same query twice may return different data.
Usually this happens because some other transaction
updated data and was successfully committed after first
but before second query.

Phantom reads
: When we query for set of rows twice second query may return
rows not present in result returned by first query.
Usually this happens because some other transaction inserted rows
to queried table and was successfully committed between our queries.

#### @Transactional(rollbackFor=..., noRollbackFor=)

By default transaction are rolled back only 
on uncaught runtime exceptions.
`rollbackFor` and `noRollbackFor` properties allows us to
set additional exceptions types for which transaction should
or should not rolled back.

#### @Transactional(readOnly=...)

Set `readOnly=true` when transaction doesn't write back
to database. This will allow underlying implementation to
possibly optimize data access.

This settings make sense only on methods that start new
transaction (with propagation `REQUIRED`, `REQUIRES_NEW` and `NESTED`).

#### @Transactional(timeout=...)

Transaction timeout in seconds.

