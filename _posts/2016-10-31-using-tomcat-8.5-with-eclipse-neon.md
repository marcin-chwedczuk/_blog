---
layout: post
cover: 'assets/images/mc_cover8.jpg'
title: Using Tomcat 8.5 with Eclipse Neon on Ubuntu
date:   2016-10-31 00:00:00
tags: java eclipse
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

When you start lerning Spring MVC development configuring
Tomcat server in Eclipse Neon IDE can be a difficult task.
This tutorial will help you setup your development environment.

#### Installing Tomcat 8.5

* Visit [Apache Tomcat download page](https://tomcat.apache.org/download-80.cgi) and grab `apache-tomcat-8.5.6.tar.gz` file.
 You can also download file from terminal:

{% highlight no-highlight %}
$ wget http://ftp.ps.pl/pub/apache/tomcat/tomcat-8/v8.5.6/bin/apache-tomcat-8.5.6.tar.gz
{% endhighlight %}

* To make things easier you will install Tomcat inside your home directory.
 I assume that you already installed Java on your box, 
 if not now is the time to do this. To instal Java follow tutorial at [webupd8](http://www.webupd8.org/2012/09/install-oracle-java-8-in-ubuntu-via-ppa.html).

{% highlight no-highlight %}
$ # We will install Tomcat in $HOME/bin/tomcat

$ mkdir -p ~/bin/tomcat
$ tar xzvf ~/Downloads/apache-tomcat-8.5.6.tar.gz \
 -C ~/bin/tomcat/ \
 --strip-components=1
{% endhighlight %}

* Let's check if everything is OK by starting Tomcat and opening 
 `http://localhost:8080` in your favorite browser:

{% highlight no-highlight %}
$ cd ~/bin/tomcat/bin
$ ./catalina.sh run
# To stop server press Ctrl+C
{% endhighlight %}

You should see Tomcat welcome page:
![Tomcat Welcome screen](assets/images/2016-10-31/1_tomcat_welcome.png)

* Now we will add an administrator account on Tomcat server. This is not needed
 by Eclipse but it may come in handy when you will later want to play
 with Tomcat:

{% highlight no-highlight %}
$ cd ~/bin/tomcat/conf
$ vim tomcat-users.xml
{% endhighlight %}

Now you must add the following line to `tomcat-users.xml` file:
{% highlight xml %}
<tomcat-users ...>
  ...
  <user username="admin" password="1234" roles="manager-gui,admin-gui"/>
</tomcat-users>
{% endhighlight %}
Here we are creating `admin` user with `1234` password and we give him (or her)
permissions to administration gui.
Let's start Tomcat again (using `./catalina.sh run`) and check that
we can visit Tomcat manager page (located at `http://localhost:8080/manager/html`):
![Tomcat Welcome screen](assets/images/2016-10-31/2_tomcat_manager.png)

#### Configuring Eclipse Neon

Before we start check that you have following plugins installed:

* [JST Server Adapters](https://marketplace.eclipse.org/content/eclipse-jst-server-adapters-apache-tomcat-jonas-j2ee)
![Eclipse marketplace 1](assets/images/2016-10-31/3_market_1.png)

* [Maven integration for WTP](https://www.eclipse.org/m2e-wtp/)
![Eclipse marketplace 2](assets/images/2016-10-31/3_market_2.png)

Now we must create new Server Runtime Environment. Go to Preferences -> Server -> Runtime Environment -> Add...
![Tomcat Welcome screen](assets/images/2016-10-31/4_env_2.png)

Then specify path to your Tomcat installation (`/home/user_name/tomcat`)
and optionally JRE (use Oracle Java 8 if available) and click Finish.
![Tomcat Welcome screen](assets/images/2016-10-31/4_env_3.png)

#### There is no Tomcat 8.5 in my wizard (if you completed previous steps skip this secion)

There is a bug in Eclipse that prevents some users from seeing
Tomcat 8.5 option in thier wizards:
![Tomcat Welcome screen](assets/images/2016-10-31/4_env_1.png)

The solution is simple, we manually change Tomcat version number say
from 8.5.6 to 8.0.8.5.6 and this will allow us to use newer Tomcat version
with buggy Eclipse.
More details can be found in [this SO question](http://stackoverflow.com/questions/37024876/how-to-use-tomcat-8-5-x-and-tomee-7-x-with-eclipse).

Following script will will patch Tomcat server:
{% highlight no-highlight %}
#!/bin/bash
cd ~/bin/tomcat

# Create backup
cp ../lib/catalina.jar ../lib/catalina.jar.backup

# Create patch directory and extract catalina.jar there
mkdir patch && cd patch
jar xvf ../lib/catalina.jar

# Change version number
cd org/apache/catalina/util/
sed -i 's/8.5.6/8.0.8.5.6/' ServerInfo.properties
cd ../../../../

# Pack patched files into jar
jar cvf catalina.jar .

# Overwrite old catalina.jar
cp ./catalina.jar ../lib/

# Cleanup
cd .. && rm -rf patch
{% endhighlight %}
After running script try to start Tomcat server to check if it is working.
Then if everything is OK create new Runtime Environment in Eclipse using Tomcat 8 option.

#### Starting Tomcat from Eclipse

Open Servers window (press Ctrl+3 and write in search box Servers).
Use link in Servers window to open New Server wizard and create a new server:
![Tomcat Welcome screen](assets/images/2016-10-31/5_servers.png)

You should see new server created:
![Tomcat Welcome screen](assets/images/2016-10-31/5_servers_2.png)

Click on server and choose Clean option, then click again and select Start.
If you have Tomcat running in terminal (`./catalina.sh run`) stop it before 
you start Tomcat via Eclipse. Console window should display various
log entries from starting Tomcat. Now click on server and select Stop.

Now it's time to restart Eclipse and check if everything works after
restart.

#### Creating simple Spring MVC app

We will create simple Spring MVC application to check if everything is working.
Let's start by creating new Maven project (New Project -> Maven Project and check Create simple project):
![Tomcat Welcome screen](assets/images/2016-10-31/6_mvn.png)
Don't forget to select WAR as packagin method.

Open your POM file in XML editor and add following lines to it:
{% highlight xml %}
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">

	...

  <!-- Spring MVC and Servlet API -->
  <dependencies>
    <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-webmvc</artifactId>
      <version>4.3.3.RELEASE</version>
    </dependency>
    <dependency>
      <groupId>javax.servlet</groupId>
      <artifactId>jstl</artifactId>
      <version>1.2</version>
    </dependency>
    <dependency>
      <groupId>javax.servlet</groupId>
      <artifactId>javax.servlet-api</artifactId>
      <version>3.1.0</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>

  <!-- enable java 8 -->
  <properties>
    <maven.compiler.source>1.8</maven.compiler.source>
    <maven.compiler.target>1.8</maven.compiler.target>
  </properties>
</project>
{% endhighlight %}

Then let's add four more files to our project:
![Tomcat Welcome screen](assets/images/2016-10-31/6_proj.png)

{% highlight java %}
// HelloController.java
package hellotomcat;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class HomeController {

    @RequestMapping("/")
    public String welcome(Model model) {
        model.addAttribute("greeting", "gretting!!!");
        model.addAttribute("tagline", "it works");
        
        return "welcome";
    }
}
{% endhighlight %}
{% highlight xml %}
<!-- WEB-INF/web.xml -->

<?xml version="1.0" encoding="UTF-8"?>
<web-app version="3.0" xmlns="http://java.sun.com/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_3_0.xsd">
  <servlet>
    <servlet-name>DefaultServlet</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
  </servlet>
  <servlet-mapping>
    <servlet-name>DefaultServlet</servlet-name>
    <url-pattern>/</url-pattern>
  </servlet-mapping>
</web-app>
{% endhighlight %}
{% highlight xml %}
<!-- DefaultServlet-servlet.xml -->

<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:context="http://www.springframework.org/schema/context"
  xmlns:mvc="http://www.springframework.org/schema/mvc"
  xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-4.0.xsd http://www.springframework.org/schema/mvc http://www.springframework.org/schema/mvc/spring-mvc-4.0.xsd">
  <mvc:annotation-driven />
  <context:component-scan base-package="hellotomcat" />
  
  <bean
    class="org.springframework.web.servlet.view.InternalResourceViewResolver ">
    <property name="prefix" value="/WEB-INF/jsp/" />
    <property name="suffix" value=".jsp" />
  </bean>
</beans>
{% endhighlight %}
{% highlight xml %}
<!-- WEB-INF/jsp/welcome.jsp -->

<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<html>
<head>
	<link rel="stylesheet"
		href="//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css">
	<title>Welcome</title>
</head>
<body>
	<section>
		<div class="jumbotron">
			<div class="container">
				<h1>${greeting}</h1>
				<p>${tagline}</p>
			</div>
		</div>
	</section>
</body>
</html>
{% endhighlight %}

Now click on `pom.xml` select Run As -> Maven install, this should
create `hellotomcat-0.0.1-SNAPSHOT.war` file in target directory.

Click on project select Run As -> Run Configurations, then select Apache Tomcat and press New button.
![Tomcat Welcome screen](assets/images/2016-10-31/7_rc.png)
Click Apply and Close.

Click on project select Run As -> Run on Server:
![Tomcat Welcome screen](assets/images/2016-10-31/7_ros.png)
and Finish.

Go to `http://localhost:8080/hellotomcat/` and check if you see greetings.
Now open `HomeController` file change text and save changes, after a few
seconds refresh browser page - you should see your new text.


