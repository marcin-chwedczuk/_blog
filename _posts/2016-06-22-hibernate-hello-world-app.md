---
layout: post
cover: 'assets/images/cover5.jpg'
title: Hibernate hello world application
date:   2016-06-22 00:00:00
tags: java hibernate
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
---

In this tutorial we'll create minimal application that will allow us 
to start playing with Hibernate ORM. I will present two hello world's one for
vanilla Hibernate and one for Hibernate via JPA [(Java Persistence API)](http://stackoverflow.com/questions/9881611/whats-the-difference-between-jpa-and-hibernate).  
We will use:

* Java 8 (with new `java.time` date time API)
* Hibernate 5
* [Maven](https://maven.apache.org/) as build tool
* [Log4j](https://logging.apache.org/log4j/1.2) to log executed SQL queries 

There is one more thing before we start - we need to setup database. I assume 
that you will be using PostgreSQL but you should have no trouble using
this tutorial with other databases like MySQL. Here are PostgreSQL 
installation instructions [for Windows](http://www.postgresqltutorial.com/install-postgresql/) 
and [for Ubuntu](http://www.indjango.com/ubuntu-install-postgresql-and-pgadmin/). 
If you are Linux user and you feel adventureous you may try to
[run PostgreSQL inside Docker container](https://github.com/sameersbn/docker-postgresql).

One more thing if you decided to install PostgreSQL don't forget to install
[pgAdmin](https://www.pgadmin.org/download/), this is great tool that helps you
manage your database:
![pgAdmin GUI](assets/images/2016-06-22/pgadmin_gui.png)

#### Common steps

##### Prepare Maven Project

Let's start with generating project structure using Maven:
{% highlight no-highlight %}
$ cd where/to/put/my/project/code

$ mvn archetype:generate -DgroupId=mc.hibernatetutorial \
-DartifactId=hibernateTutorial \
-DarchetypeArtifactId=maven-archetype-quickstart \
-DinteractiveMode=false
{% endhighlight %}
This will generate folder structure:
{% highlight no-highlight %}
$ tree hibernateTutorial/

hibernateTutorial/
|-- pom.xml
`-- src
    |-- main
    |   `-- java
    |       `-- mc
    |           `-- hibernatetutorial
    |               `-- App.java
    `-- test
        `-- java
            `-- mc
                `-- hibernatetutorial
                    `-- AppTest.java

{% endhighlight %}
Next we will need to create `resources` directory to hold Hibernate and Log4j configuration
files:
{% highlight no-highlight %}
$ mkdir hibernateTutorial/src/main/resources
{% endhighlight %}

Let's check if everything is OK by compiling our project:
{% highlight no-highlight %}
$ cd hibernateTutorial/
$ mvn compile

....
[INFO] ------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------
....
{% endhighlight %}
Compilation was successful so it's time to replace `pom.xml` file with:
{% highlight xml %}
<?xml version="1.0"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">

  <modelVersion>4.0.0</modelVersion>
  <groupId>mc.hibernatetutorial</groupId>
  <artifactId>hibernateTutorial</artifactId>
  <packaging>jar</packaging>
  <version>1.0-SNAPSHOT</version>
  <name>hibernateTutorial</name>
  <url>http://maven.apache.org</url>

  <properties>
    <project.build.sourceEncoding>
        UTF-8
    </project.build.sourceEncoding>
  </properties>

  <build>
    <plugins>
      <!-- enable Java 8 support -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.5.1</version>
        <configuration>
          <source>1.8</source>
          <target>1.8</target>
        </configuration>
      </plugin>
      <!-- this plugin allows us to run 
           project using simple command:
           $ mvn exec:java -->
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>1.2.1</version>
        <executions>
          <execution>
            <goals>
              <goal>java</goal>
            </goals>
          </execution>
        </executions>
        <configuration>
          <mainClass>mc.hibernatetutorial.App</mainClass>
          <arguments></arguments>
        </configuration>
      </plugin>
    </plugins>
  </build>

  <dependencies>
    <!-- Hibernate library -->
    <dependency>
      <groupId>org.hibernate</groupId>
      <artifactId>hibernate-entitymanager</artifactId>
      <version>5.1.0.Final</version>
    </dependency>

    <!-- needed if you want to use new java.time API -->
    <dependency>
      <groupId>org.hibernate</groupId>
      <artifactId>hibernate-java8</artifactId>
      <version>5.1.0.Final</version>
    </dependency>

    <!-- needed if you want to use javax.validation -->
    <dependency>
      <groupId>org.hibernate</groupId>
      <artifactId>hibernate-validator</artifactId>
      <version>5.2.4.Final</version>
    </dependency>

    <!-- needed if you want to use javax.validation -->
    <dependency>
      <groupId>javax.el</groupId>
      <artifactId>javax.el-api</artifactId>
      <version>2.2.4</version>
    </dependency>

    <!-- PostgreSql driver, if you use another DB change
             this dependency -->
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>9.4.1208.jre7</version>
    </dependency>

    <!-- Log4j library -->
    <dependency>
      <groupId>log4j</groupId>
      <artifactId>log4j</artifactId>
      <version>1.2.17</version>
    </dependency>
  </dependencies>
</project>
{% endhighlight %}

Let's check again if everything works by issuing commands:
{% highlight no-highlight %}
$ cd hibernateTutorial/
$ mvn compile
$ mvn exec:java
{% endhighlight %}
You should see "Hello, World!" printed among pile of log messages (`-q` mvn option
can be used suppress log messages).

Next we need to add `log4j.xml` configuration file to `src/main/resources` directory:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE log4j:configuration SYSTEM "log4j.dtd">
<log4j:configuration debug="false"
     xmlns:log4j='http://jakarta.apache.org/log4j/'>

    <appender name="file" 
                class="org.apache.log4j.RollingFileAppender">
        <!-- name of log file: -->
        <param name="file" value="hibernate_tutorial.log" />
        <layout class="org.apache.log4j.PatternLayout">
            <param name="ConversionPattern"
                   value="[%d{HH:mm:ss}] %m%n" />
        </layout>
    </appender>

    <appender name="console" 
                class="org.apache.log4j.ConsoleAppender">
        <param name="Target" value="System.out"/>
        <layout class="org.apache.log4j.PatternLayout">
            <param name="ConversionPattern" 
                   value="[%d{HH:mm:ss}] %m%n"/>
        </layout>
    </appender>

    <!-- change log level to DEBUG
         if you want more detailed
         logs from Hibernate -->
    <logger name="org.hibernate">
        <level value="ERROR"/>
    </logger>
    
    <!-- log SQL queries executed by
         Hibernate library -->
    <logger name="org.hibernate.SQL">
        <level value="DEBUG"/>
    </logger>

    <!-- log values of SQL queries parameters -->
    <logger name="org.hibernate.type.descriptor.sql.BasicBinder">
        <level value="TRACE" />
    </logger>

    <root>
        <level value="DEBUG" />
        <appender-ref ref="file" />
        <appender-ref ref="console" />
    </root>

</log4j:configuration>
{% endhighlight %}
Now we can use Log4j logger in our application:
{% highlight java %}
// src/main/java/mc/hibernatetutorial/App.java
package mc.hibernatetutorial;

import org.apache.log4j.Logger;

public class App 
{
    private static final Logger logger = 
                        Logger.getLogger(App.class);

    public static void main(String[] args)
    {
        logger.debug("Hello, World!");
    }
}
{% endhighlight %}
After `mvn compile` and `mvn exec:java -q` you should see message printed to
terminal and to `hibernate_tutorial.log` file in the project directory.

##### Prepare database

Before we start playing with Hibernate we should create separate
database user for our app. User account can be created from pgAdmin
by executing following SQL:
{% highlight sql %}
create user huser with password `hpass`;
{% endhighlight %}
We will also create database dedicated for our app, named `tutorialdb`:
{% highlight sql %}
create database tutorialdb;
{% endhighlight %}
And allow `huser` to create/modify/drop tables in `tutorialdb`:
{% highlight sql %}
grant all privileges on database tutorialdb to huser;
{% endhighlight %}

After executing these instructions you should be able to login as `huser`
and create table inside `tutorialdb` database.

INFO: When you try to connect to local PostgreSQL instance always specify
name of server as an IP address e.g. `127.0.0.1`, otherwise you may not be able
to login without tweaking PostgreSQL configuration 
(more details [here](http://stackoverflow.com/questions/18664074/getting-error-peer-authentication-failed-for-user-postgres-when-trying-to-ge)).

#### Hello, World! in vanilla Hibernate

Finally we may start playing with Hibernate ORM.
Let's begin by creating Hibernate configuration file `hibernate_cfg.xml`
inside `src/main/resources` directory:
{% highlight xml %}
<?xml version="1.0" encoding="utf-8"?>
<hibernate-configuration>
  <session-factory>
    <!-- Database connection settings -->
    <property name="hibernate.dialect">org.hibernate.dialect.PostgreSQL82Dialect</property>
    <property name="hibernate.connection.driver_class">org.postgresql.Driver</property>
    <property name="hibernate.connection.username">huser</property>
    <property name="hibernate.connection.password">hpass</property>
    <property name="hibernate.connection.url">jdbc:postgresql://127.0.0.1:5432/tutorialdb</property>
    <!-- JDBC connection pool (use the built-in) -->
    <property name="connection.pool_size">1</property>
    <!-- Disable the second-level cache  -->
    <property name="cache.provider_class">org.hibernate.cache.internal.NoCacheProvider</property>
    <!-- Log SQL queries -->
    <property name="format_sql">true</property>
    <property name="use_sql_comments">true</property>
    <!-- Drop and re-create the database schema on startup -->
    <property name="hbm2ddl.auto">create</property>
    <!-- MAPPINGS -->
    <mapping class="mc.hibernatetutorial.model.TestEntity"/>
  </session-factory>
</hibernate-configuration>
{% endhighlight %}
This file can be quite complex, it contains various settings used by ORM.
The most important for us are:

* `hibernate.connection.username` and `hibernate.connection.password` - these
 properties contains credentials used to connect to database server
* `hibernate.connection.url` - address of database server.
 The last part of url contains database name (in our case `tutorialdb`)
* `format_sql` and `use_sql_comments` properties -  when set to `true` will force
 Hibernate to log SQL queries executed against database
* `hbm2ddl.auto` property - when set to `create` will drop and recreate all tables
 in database at application start. This is useful when you are learning Hibernate
 but can be frustrating because all changes made by you to database will be lost
 when you run your application again. To disable this feature use `validate` as property
 value, this will only check if database contains all required tables but will not drop them.
* `<mapping />` elements - allow you to list all entity classes that you want
 to use with Hibernate. For now we list only single class:
 `mc.hibernatetutorial.model.TestEntity`.

Next we must create our entity class `mc.hibernatetutorial.model.TestEntity`:
{% highlight java %}
// src/main/java/mc/hibernatetutorial/model/TestEntity.java
package mc.hibernatetutorial.model;

import javax.persistence.*;

@Entity
@Table(name = "test")
public class TestEntity {
    @Id
    @GeneratedValue
    private Long id;

    @Column(unique = true)
    private String name;

    public TestEntity() { }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return String.format("User id: %d, name: %s", getId(), getName());
    }
}
{% endhighlight %}
The are two ways in which you may map entities using Hibernate: via annotations and via xml
files (with `.hbm.xml` extension). Annotations are more popular these days and so 
we will use them. First we mark our class as entity using `@Entity` annotation.
Then we specify table name that will hold `TestEntity` data (by default table name
is equal to class name) using `@Table` annotation. Every entity class must have
a primary key, we use `@Id` to mark one of class fields as key. We also use `@GeneratedValue`
annotation this will hint hibernate that we want database server to generate entity keys.
The last annotation that we use is `@Column`, we can use it to change column name for given
field or as in our example to set unique constrain.

Finally we may write code to save our `TestEntity` to database:
{% highlight java %}
// src/main/java/mc/hibernatetutorial/App.java
package mc.hibernatetutorial;

import org.apache.log4j.Logger;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;

import mc.hibernatetutorial.model.*;

public class App 
{
    private static final Logger logger = Logger.getLogger(App.class);

    public static void main(String[] args)
    {
        // read configuration and build session factory
        final StandardServiceRegistry registry =
                new StandardServiceRegistryBuilder()
                        .configure("hibernate_cfg.xml")
                        .build();

        SessionFactory sessionFactory = null;

        try {
            sessionFactory = new MetadataSources(registry)
                    .buildMetadata()
                    .buildSessionFactory();
        }
        catch (Exception e) {
            StandardServiceRegistryBuilder.destroy(registry);
            logger.error("cannot create sessionFactory", e);
            System.exit(1);
        }

        // create session, open transaction and save test entity to db
        Session session = sessionFactory.openSession();
        Transaction tx = session.beginTransaction();

        try {
            TestEntity testEntity = new TestEntity();
            testEntity.setName("super foo");

            session.persist(testEntity);
            tx.commit();
        }
        catch (Exception e) {
            tx.rollback();
            logger.error("cannot commit transaction", e);
        }
        finally {
            session.close();
        }

        // clean up
        sessionFactory.close();
    }
}
{% endhighlight %}
We start by building `SessionFactory`, this is pretty boring stuff that needs to be done.
Notice how we are loading settings from our `hibernate_cfg.xml` file:
{% highlight java %}
final StandardServiceRegistry registry =
        new StandardServiceRegistryBuilder()
                .configure("hibernate_cfg.xml")
                .build();
{% endhighlight %}
Next we use `SessionFactory` to create new session (session may be treated as a implementation
of [Unit of Work](http://martinfowler.com/eaaCatalog/unitOfWork.html) pattern, generally you should create session per transaction).
We use `beginTransaction()` to start new database transaction. Then we create our `TestEntity`
object, we set some properties and we save it to database using `session.persist()` call.
Next we commit transaction using `tx.commit()` and finally we are freeing session resources
using `session.close()`.

After `mvn compile` and `mvn exec:java` Hibernate should generated single table `test` in
our `tutorialdb` database, and should insert single row representing our 
`TestEntity` to that table.
You may want to dig into log messages to see actual SQL statements used to create table
and insert row. Here for example is generated SQL that inserted our `TestEntity` row:
{% highlight SQL %}
/* insert mc.hibernatetutorial.model.TestEntity
    */ insert 
    into
        test
        (name, id) 
    values
        (?, ?)

binding parameter [1] as [VARCHAR] - [super foo]
binding parameter [2] as [BIGINT] - [1]
{% endhighlight %}

Now we can start exploring more advanced Hibernate topics like
[mapping](http://www.tutorialspoint.com/hibernate/hibernate_annotations.htm) or 
[querying](http://www.tutorialspoint.com/hibernate/hibernate_query_language.htm).

Code used in this tutorial: [https://github.com/marcin-chwedczuk/java-hibernate-helloworld/tree/vanilla](https://github.com/marcin-chwedczuk/java-hibernate-helloworld/tree/vanilla)

#### Hello, World! using JPA

Now we may explore Hibernate ORM via Java Persistence API.
Let's begin by creating JPA configuration file `persistence.xml`
inside `src/main/resources/META-INF` directory:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<persistence xmlns="http://xmlns.jcp.org/xml/ns/persistence" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.1" xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/persistence                             http://xmlns.jcp.org/xml/ns/persistence_2_1.xsd">
  <persistence-unit name="HelloWorldPU" transaction-type="RESOURCE_LOCAL">
    <!--
        MAPPINGS
    -->
    <class>mc.hibernatetutorial.model.TestEntity</class>
    <!-- Use only classes specified in MAPPINGS -->
    <exclude-unlisted-classes>true</exclude-unlisted-classes>
    <properties>
      <!-- Configuring JDBC properties -->
      <property name="javax.persistence.jdbc.url" value="jdbc:postgresql://127.0.0.1:5432/tutorialdb" />
      <property name="javax.persistence.jdbc.user" value="huser" />
      <property name="javax.persistence.jdbc.password" value="hpass" />
      <property name="javax.persistence.jdbc.driver" value="org.postgresql.Driver" />
      <property name="hibernate.dialect" value="org.hibernate.dialect.PostgreSQL82Dialect" />

      <!-- Log SQL queries -->
      <property name="hibernate.format_sql" value="true" />
      <property name="hibernate.use_sql_comments" value="true" />

      <!-- Drop and re-create the database schema on startup -->
      <property name="javax.persistence.schema-generation.database.action" value="drop-and-create" />
       <!-- Use only classes specified in MAPPINGS -->
      <property name="hibernate.archive.autodetection" value="none" />
    </properties>
  </persistence-unit>
</persistence>
{% endhighlight %}
This file can be quite complex, it contains various settings used by ORM.
The most important for us are:

* `javax.persistence.jdbc.user` and `javax.persistence.jdbc.password` - these
 properties contains credentials used to connect to database server
* `javax.persistence.jdbc.url` - address of database server.
 The last part of url contains database name (in our case `tutorialdb`)
* `hibernate.format_sql` and `hibernate.use_sql_comments` properties -  
 when set to `true` will force
 Hibernate to log SQL queries executed against database
* `javax.persistence.schema-generation.database.action` property - 
 when set to `drop-and-create` will drop and recreate all tables
 in database at application start. This is useful when you are learning Hibernate
 but can be frustrating because all changes made by you to database will be lost
 when you run your application again. To disable this feature use `none` as property
 value.
* `<class />` elements - allow you to list all entity classes that you want
 to use with Hibernate. For now we list only single class:
 `mc.hibernatetutorial.model.TestEntity`.

Next we must create our entity class `mc.hibernatetutorial.model.TestEntity`:
{% highlight java %}
// src/main/java/mc/hibernatetutorial/model/TestEntity.java
package mc.hibernatetutorial.model;

import javax.persistence.*;

@Entity
@Table(name = "test")
public class TestEntity {
    @Id
    @GeneratedValue
    private Long id;

    @Column(unique = true)
    private String name;

    public TestEntity() { }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return String.format("User id: %d, name: %s", getId(), getName());
    }
}
{% endhighlight %}
JPA uses annotations to control how ORM maps classes to database tables and columns.
We mark `TestEntity` class as entity using `@Entity` annotation.
We specify table name that will hold `TestEntity` data (by default table name
is equal to class name) using `@Table` annotation. Every entity class must have
a primary key, we use `@Id` to mark one of class fields as key. We also use `@GeneratedValue`
annotation to hint ORM that we want database server to generate entity keys.
The last annotation that we use is `@Column`, we can use it to change column name for given
field or as in our example to set unique constrain.

Finally we may write code to save our `TestEntity` class to database:
{% highlight java %}
// src/main/java/mc/hibernatetutorial/App.java
package mc.hibernatetutorial;

import org.apache.log4j.Logger;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.Persistence;

import mc.hibernatetutorial.model.*;

public class App 
{
    private static final Logger logger = Logger.getLogger(App.class);

    public static void main(String[] args)
    {
        logger.debug("starting application....");

        final EntityManagerFactory emf = 
                Persistence.createEntityManagerFactory("HelloWorldPU");

        EntityManager entityManager = emf.createEntityManager();
        EntityTransaction tx = entityManager.getTransaction();
        tx.begin();

        try {
            TestEntity testEntity = new TestEntity();
            testEntity.setName("super foo");    

            entityManager.persist(testEntity);
            tx.commit();
        }
        catch (Exception e) {
            logger.error("cannot commit transaction", e);
            tx.rollback();
        }
        finally {
            entityManager.close();
        }
        
        emf.close();
    }
}
{% endhighlight %}
We start by building `EntityManagerFactory`, this will load our configuration
from `persistence.xml`: 
{% highlight java %}
final EntityManagerFactory emf = 
        Persistence.createEntityManagerFactory("HelloWorldPU");
{% endhighlight %}
Notice that we use name `HelloWorldPU`, the same as used in `<persistence-unit />` element
in `persistence.xml`.

Next we use `EntityManagerFactory` to create new `EntityManger`
(entity manager may be treated as a implementation
of [Unit of Work](http://martinfowler.com/eaaCatalog/unitOfWork.html) pattern, 
generally you should create one entity manager per transaction).
Next we use `entityManager.getTransaction()` and `tx.begin()` to start new database transaction. 
Then we create our `TestEntity`
object, we set some properties and we save it to database using `entityManager.persist()` call.
Next we commit transaction using `tx.commit()` and finally we are freeing resources
using `entityManager.close()`.

After `mvn compile` and `mvn exec:java` Hibernate should generated single table `test` in
our `tutorialdb` database, and should insert single row representing our 
`TestEntity` to that table.
You may want to dig into log messages to see actual SQL statements used to create table
and insert row. Here for example is generated SQL that inserted our `TestEntity` row:
{% highlight SQL %}
/* insert mc.hibernatetutorial.model.TestEntity
    */ insert 
    into
        test
        (name, id) 
    values
        (?, ?)

binding parameter [1] as [VARCHAR] - [super foo]
binding parameter [2] as [BIGINT] - [1]
{% endhighlight %}

Now we can start exploring more advanced Hibernate topics like
[mapping](http://www.tutorialspoint.com/hibernate/hibernate_annotations.htm) or 
[querying](http://www.tutorialspoint.com/hibernate/hibernate_query_language.htm).

Code used in this tutorial: [https://github.com/marcin-chwedczuk/java-hibernate-helloworld/tree/jpa](https://github.com/marcin-chwedczuk/java-hibernate-helloworld/tree/jpa)


