---
author: mc
layout: post
cover: 'assets/images/mc_cover9.jpeg'
title: Crudest CRUD using Spring
date: 2016-12-27 00:00:00
tags: java 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

EDIT: In this post I'll use Spring XML configuration, in new
applications you should definitely use Spring JavaConfig configuration (via
annotations and Java classes).
For more info see reddit comment discussion [here](https://www.reddit.com/r/springsource/comments/5mjwa2/100_crudest_crud_using_spring_and_jdbc/).

In this blog post we will create simple CRUD (Create Retrieve Update Delete)
application using Spring and JDBC.
Before we start we need to setup our database.
I will assume that you already have Postgres running on your box.

#### Setup database

Because we want to follow good programming practices we will create a
separate user in Postgres database dedicated only for our application.
Open pgAdmin and execute following SQL to create user `crud`:
{% highlight sql %}
create user crud
  with password 'crud';
{% endhighlight %}
Next create `cruddb` database with `crud` as db owner:
{% highlight sql %}
create database cruddb
  with owner crud
       encoding 'utf-8';
{% endhighlight %}
Now it's time to switch to `cruddb` database and create
`app_data` table:
{% highlight sql %}
create table app_data (
  id serial primary key,
  index int not null,
  value text not null
);
{% endhighlight %}
We should create this table logged as `crud` user,
otherwise `curd` will be denied access to the table.
If you don't want to login as `curd` you may create
table from superuser account and then grant permissions
to `curd` user:
{% highlight sql %}
grant all on table app_data to crud

-- needed to autogenerate primary key
grant all on sequence app_data_id_seq to crud
{% endhighlight %}

#### Setup application

I assume that you already have Maven installed because
we are going to use it to create our CRUD application:
{% highlight no-highlight %}
$ mvn archetype:generate \
  -DgroupId="io.mc.crudapp" \
  -DartifactId=crudapp \
  -Dversion=1.0 \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false

$ tree crudapp/
crudapp
|-- pom.xml
`-- src
    |-- main
    |   `-- java
    |       `-- io
    |           `-- mc
    |               `-- crudapp
    |                   `-- App.java
    `-- test
        `-- java
            `-- io
                `-- mc
                    `-- crudapp
                        `-- AppTest.java

11 directories, 3 files
{% endhighlight %}
NOTE: Try to use `archetype:create` instead of `archetype:generate` if you
get an error using above command

Now we may load our application into our favorite IDE or just stick
to command line.

Since we will be using Spring and Postgres JDBC driver we need to
add them as a dependencies to our POM. We also want to use connection
pooling (database connections are expensive to create so we want to
reuse them whenever possible) so we will add a dependency on 
HikariCP library:
{% highlight xml %}
<!-- pom.xml -->
<dependencies>
   <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-context</artifactId>
      <version>4.3.5.RELEASE</version>
   </dependency>
   <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-jdbc</artifactId>
      <version>4.3.5.RELEASE</version>
   </dependency>

   <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>9.4-1200-jdbc41</version>
   </dependency>

   <dependency>
      <groupId>com.zaxxer</groupId>
      <artifactId>HikariCP</artifactId>
      <version>2.5.1</version>
   </dependency>
</dependencies>
{% endhighlight %}
We should also change to using Java 8
so we may use lambdas and all cool stuff, we do this
by adding to our POM:
{% highlight xml %}
<properties>
   <maven.compiler.source>1.8</maven.compiler.source>
   <maven.compiler.target>1.8</maven.compiler.target>
   <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
{% endhighlight %}
And finally we will use `exec-maven-plugin` 
to strightforward running our application from
command line:
{% highlight xml %}
<build>
  <plugins>
    <plugin>
      <groupId>org.codehaus.mojo</groupId>
      <artifactId>exec-maven-plugin</artifactId>
      <version>1.5.0</version>
      <executions>
        <execution>
          <goals>
            <goal>java</goal>
          </goals>
        </execution>
      </executions>
      <configuration>
        <mainClass>io.mc.crudapp.Main</mainClass>
      </configuration>
    </plugin>
  </plugins>
</build>
{% endhighlight %}
NOTE: You may find complete `pom.xml` in attached source code

You may write
{% highlight no-highlight %}
$ mvn clean install
{% endhighlight %}
to rebuild CURD application and
{% highlight no-highlight %}
$ mvn exec:java
{% endhighlight %}
to start it.

#### Setup Spring

Add following code to the `main` method:
{% highlight java %}
public class Main {
    public static void main(String[] args) {
        ClassPathXmlApplicationContext appContext =
                new ClassPathXmlApplicationContext(new String[] {
                        "spring/app-context.xml"
                });

        // We can use Spring context here

        appContext.close();
    }
}
{% endhighlight %}
We must also create `resource/spring/app-context.xml` file:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<beans 
  xmlns="http://www.springframework.org/schema/beans"
  xmlns:context="http://www.springframework.org/schema/context"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.springframework.org/schema/beans     http://www.springframework.org/schema/beans/spring-beans-3.0.xsd     http://www.springframework.org/schema/context     http://www.springframework.org/schema/context/spring-context-3.0.xsd">
  <context:annotation-config />
</beans>
{% endhighlight %}

After these two steps we should have working Spring application.
Right now no beans are registered in Spring container, this will
change in the next section.

#### Setup Spring JDBC Data source

To enable Spring to access database
we must define data source in `app-context.xml`: 
{% highlight xml %}
<!-- Without pooling: -->
<bean id="dataSource"
    class="org.springframework.jdbc.datasource.DriverManagerDataSource">

  <property name="driverClassName" value="org.postgresql.Driver" />
  <property name="url" value="jdbc:postgresql://localhost:5432/cruddb" />
  <property name="username" value="crud" />
  <property name="password" value="crud" />
</bean>
{% endhighlight %}
`DriverManagerDataSource` class is provided by Spring as one
of several implementations of `DataSource` interface.
`DriverManagerDataSource` returns a new connection to database
every time application asks for a connection.
Connection is created using specified JDBC driver.
`SingleConnectionDataSource` is another DataSource implementation
provided by Spring
that returns always the
same connection (having single connection 
has serious implications in multithreaded
apps - when two threads want to
access database concurrently one of them must wait).

Now we may use `dataSource` bean to insert row into `app_data` table:
{% highlight java %}
final String sql = "insert into app_data(index,value) values(?,?)";

DataSource ds = appContext.getBean(DataSource.class);
try (Connection conn = ds.getConnection();
    PreparedStatement stmt =
         conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

       stmt.setInt(1, 101);
       stmt.setString(2, "foo");

       stmt.executeUpdate();

       // retrieve id of inserted row
       try(ResultSet rs = stmt.getGeneratedKeys()) {
           rs.next();
           Long id = rs.getLong(1);
           System.out.println("id: " + id);
       }
}
catch (SQLException ex) {
   ex.printStackTrace();
}
{% endhighlight %}

#### Writing simple DAO

It is always a good idea to isolate data access code into
a separate component, in our case we will create `AppDataDAO` bean that
will be responsible for CURD operations on `app_data` table.

To make passing and retrieving data via `AppDataDAO` easier we will define
`AppData` class that will represent a single row from `app_data` table:
{% highlight java %}
public class AppData {
    private final int id;
    private final int index;
    private final String value;

    public AppData(int id, int index, String value) {
        this.id = id;
        this.index = index;
        this.value = value;
    }

    public int getId() { return id; }
    public int getIndex() { return index; }
    public String getValue() { return value; }
}
{% endhighlight %}
It is a good practice to program to interface, so
instead of creating a single bean `AppDataDAO` we will create
`AppDataDAO` interface and then provide an implementation:
{% highlight java %}
public interface AppDataDAO {
    int insert(int index, String value);
    void update(int id, int newIndex, String newValue);
    boolean delete(int id);
    List<AppData> selectAll();
}
{% endhighlight %}
Finally we may create `JDBCAppDataDAO` class that will implement `AppDataDAO`
interface:
{% highlight java %}
public class JDBCAppDataDAO implements AppDataDAO {
    private DataSource ds;
    
    @Autowired
    public JDBCAppDataDAO(DataSource ds) {
        this.ds = Objects.requireNonNull(ds);
    }

    private interface ConnectionConsumer<T> {
        T consume(Connection conn) throws SQLException;
    }

    private <T> T usingConnection(ConnectionConsumer<T> consumer) {
        Connection connection = DataSourceUtils.getConnection(ds);

        try {
            return consumer.consume(connection);
        }
        catch (SQLException ex) {
            throw new RuntimeException(ex);
        }
        finally {
            DataSourceUtils.releaseConnection(connection, ds);
        }
    }

    @Override
    public int insert(int index, String value) {
        return usingConnection(conn -> {
            String sql = "insert into app_data(index,value) values(?,?)";
            try (PreparedStatement stmt =
                    conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
                stmt.setInt(1, index);
                stmt.setString(2, value);

                stmt.executeUpdate();

                try(ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        return rs.getInt(1);
                    }
                    else
                        throw new RuntimeException("no generated key!");
                }
            }
        });
    }
{% endhighlight %}
A few things to notice: logic responsible for acquiring and releasing
a db connection was encapsulated in `usingConnection` method.
Instead of getting connection straight from `DataSource` we use
`DataSourceUtils` class to get and release connection. This become important
when we later start using transactions, because transactions are
attached to connections we will no longer be responsible for creating
and closing connection - a transaction manager will do that for
us. When `DataSourceUtils` is asked for a new connection it first checks
if any transaction is running and if it is it returns connection used
by that transaction. If no transaction is active 
a new connection is created.

The last thing that we must do is to register our bean in Spring container:
{% highlight xml %}
 <bean name="AppDataDAO"
     class="io.mc.crudapp.JDBCAppDataDAO" />
{% endhighlight %}
and use it to insert a row:
{% highlight java %}
AppDataDAO appDataDAO = appContext.getBean(AppDataDAO.class);
appDataDAO.insert(102, "bar");
{% endhighlight %}

#### Using HikariCP

Opening a new connection to database is expensive operation.
Instead of constantly opening and closing connections we should
reuse them whenever possible. Because manually managing and resetting
connections
(before we can reuse connection we must reset it state - this will
for example clear any pending errors on connection) is error-prone
it is wise to use one of many connection pool libraries.
Here we will use HikariCP library (CP stands for Connection Pool).

Let's start by creating HikariCP configuration file `resources/db/hikari.properties`:
{% highlight no-highlight %}
dataSourceClassName=org.postgresql.ds.PGSimpleDataSource
dataSource.user=crud
dataSource.password=crud
dataSource.databaseName=cruddb
dataSource.portNumber=5432
dataSource.serverName=localhost
{% endhighlight %}
Then we must change our `dataSource` bean definition to:
{% highlight xml %}
<bean id="dataSource"
    class="com.zaxxer.hikari.HikariDataSource">
  <constructor-arg>
      <bean class="com.zaxxer.hikari.HikariConfig">
          <constructor-arg value="/db/hikari.properties" />
      </bean>
  </constructor-arg>
</bean>
{% endhighlight %}
That's all - now our application draws connections from connection pool!

#### Adding transactions to CRUD app

Let's clear `app_data` table:
{% highlight sql %}
truncate table app_data;
{% endhighlight %}
and exeucte the following code in `main`:
{% highlight java %}
AppDataDAO appDataDAO = appContext.getBean(AppDataDAO.class);
appDataDAO.insert(101, "foo");
someOperation();
appDataDAO.insert(102, "bar");

// given:
private static void someOperation() {
  throw new RuntimeException("uber error");
}
{% endhighlight %}
Of course running this program results in error and only one row
is inserted to database:
{% highlight sql %}
select * from app_data 
{% endhighlight %}
![select query result](assets/images/2017-01-07/select_result.png)

In real life application we often want to perform either all of
database operations or none of them. In our example this will mean that
we either want to insert both rows to db or none of them should be inserted.
Transactions can solve these problem for us. Transactions also offers
some level of isolation between database operations performed by
different users - but this topic is
beyond this simple tutorial.
For more information please [check Wikipedia](https://en.wikipedia.org/wiki/Isolation_(database_systems)).

Transactions are usually handled at application service level, we will
follow this pattern. As usually we will start by creating
`CRUDAppDemoService` interface:
{% highlight java %}
public interface CRUDAppDemoService {
    void doDemo();
}
{% endhighlight %}
Then we may write implementation of `CRUDAppDemoService`:
{% highlight java %}
public class CRUDAppDemoServiceImpl implements CRUDAppDemoService {
    private final TransactionTemplate txTemplate;
    private final AppDataDAO appDataDAO;

    @Autowired
    public CRUDAppDemoServiceImpl(
      TransactionTemplate txTemplate, AppDataDAO appDataDAO) {
        this.txTemplate = Objects.requireNonNull(txTemplate);
        this.appDataDAO = Objects.requireNonNull(appDataDAO);
    }

    @Override
    public void doDemo() {
        txTemplate.execute(ts -> {
            appDataDAO.insert(101, "foo");
            someOperation();
            appDataDAO.insert(102, "bar"); 

            return null;
        });
    }

    private static void someOperation() {
        throw new RuntimeException("uber error");
    }
}
{% endhighlight %}
To define boundaries of transaction we use Spring provided
`TransactionTemplate` class. All database operations executed
in callback passed to `execute` method
will be performed within transaction. In callback we have access
to `ts` parameter that allows us to manually rollback current transaction.

When we throw runtime exception from callback, transaction will be
rolled back automatically. This behaviour doesn't occur for
checked exceptions, if we want to rollback transaction in that case
we must catch exception manually and then invoke `ts.setRollbackOnly()`.

Before we can run this code we need to register `TransactionTemplate` and
`TransactionManager` in Spring container:
{% highlight xml %}
<bean name="transactionManager"
    class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
  <property name="dataSource" ref="dataSource" />
</bean>

<bean id="TransactionTemplate"
    class="org.springframework.transaction.support.TransactionTemplate"
    >
  <property name="transactionManager" ref="transactionManager" />
</bean>

<bean name="CRUDAppDemoService"
    class="io.mc.crudapp.CRUDAppDemoServiceImpl" />
{% endhighlight %}

Finally we may add to the `main` method:
{% highlight java %}
CRUDAppDemoService service = appContext.getBean(CRUDAppDemoService.class);
service.doDemo();
{% endhighlight %}
Again running our program results in error but this time neither of rows
is inserted in `app_data` table.
When we comment out call to `someOperation()` both rows
are inserted - just as we wanted.

#### Annotation driven transactions

Using `TransactionManager` is cumbersome so Spring provides a better
alternative, we may declare transaction boundaries using annotations.
Let's change our `CRUDAppDemoServiceImpl` class to:
{% highlight java %}
public class CRUDAppDemoServiceImpl implements CRUDAppDemoService {
    private final AppDataDAO appDataDAO;

    @Autowired
    public CRUDAppDemoServiceImpl(AppDataDAO appDataDAO) {
        this.appDataDAO = Objects.requireNonNull(appDataDAO);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void doDemo() {
        appDataDAO.insert(101, "foo");
        someOperation();
        appDataDAO.insert(102, "bar");
    }

    private static void someOperation() {
        throw new RuntimeException("uber error");
    }
}
{% endhighlight %}
We may see that `TransactionTemplate` is gone, and a new annotation
appeared on `doDemo()` method. `@Transactional` means that we
want to start transaction when we call this method and commit it
when we return from it. As with `TransactionTemplate` if method
trows `RuntimeException` transaction will be rolled back.
To `@Transactional` we pass a single parameter `Propagation.REQUIRED`
that means that we want Spring to use existing transaction if one
is currently active or start a new one otherwise.
If Spring will use already active transaction,
then transaction will be committed or rolled
back not at our method level but at method that started it.
`@Transactional` has
plenty of options you may want to consult official documentation to
see them all.

To make `@Transactional` work we also need to enable it in Spring
configuration file. First we must add `tx` namespace to Spring XML:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:tx="http://www.springframework.org/schema/tx"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
    http://www.springframework.org/schema/beans/spring-beans-3.0.xsd
    http://www.springframework.org/schema/context
    http://www.springframework.org/schema/context/spring-context-3.0.xsd
    http://www.springframework.org/schema/tx
    http://www.springframework.org/schema/tx/spring-tx-2.0.xsd">
{% endhighlight %}
And then we must enable annotation driven transactions:
{% highlight xml %}
<tx:annotation-driven transaction-manager="transactionManager"/>
{% endhighlight %}
That's it! Now we can use transactions without using `TransactionTemplate`.

#### Source code

[DOWNLOAD SOURCE CODE](assets/data/2017-01-07/crudest_crud.zip)

