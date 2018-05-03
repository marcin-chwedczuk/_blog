---
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: .NET Core, HttpClient, Proxy and localhost
date: 2018-05-03 00:00:00
tags: dotnet
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I wanted to spy network traffic between a `HttpClient` and
a REST service. This task turned out to be more difficult than I
though. 

My first challenge was to force `HttpClient` to use a proxy.
After a bit of googling I have found 
the following code:
{% highlight csharp %}
using System.Net;
using System.Net.Http;

var builder = new ConfigurationBuilder()
	 .SetBasePath(Directory.GetCurrentDirectory())
	 .AddJsonFile("appsettings.json");
var configuration = builder.Build();

var webProxy = new WebProxy(
	 new Uri(configuration["ProxyUri"]), 
	 BypassOnLocal: false);

var proxyHttpClientHandler = new HttpClientHandler {
	 Proxy = webProxy,
	 UseProxy = true,
};

var httpClient = new HttpClient(proxyHttpClientHandler) {
	 BaseAddress = new Uri(configuration["RestServiceUri"])
};
{% endhighlight %}
Unfortunately my REST service was exposed on `localhost`
and later I found out that proxies are not used for local requests:
{% highlight json %}
/* appsettings.json */
{
    "RestServiceUri": "http://localhost:5001/api",
    "ProxyUri": "http://localhost:8080"
}
{% endhighlight %}

OK, no problem I though,
let's just add another DNS alias to localhost - 
just to fool `Uri` class to think 
that we are accessing some other machine.
This can be done by modifying `hosts` file, which
on my Ubuntu machine is located in `/etc` directory:
{% highlight no-highlight %}
127.0.0.1   localhost
127.0.0.2   mymachine
{% endhighlight %}
Then I had to change my `appsettings.json` file:
{% highlight json %}
/* appsettings.json */
{
    "RestServiceUri": "http://mymachine:5001/api",
    "ProxyUri": "http://localhost:8080"
}
{% endhighlight %}
And my REST service configuration so that it will listen for
incoming connections on all interfaces:
{% highlight csharp %}
public static IWebHost BuildWebHost(string[] args) =>
	WebHost.CreateDefaultBuilder(args)
		 .UseStartup<Startup>()
		 .UseUrls("http://0.0.0.0:5001")
		 .Build();
{% endhighlight %}

After all these preparations I was able to intercept traffic
using [ZAP Proxy](https://www.owasp.org/index.php/OWASP_Zed_Attack_Proxy_Project):
![Intercepted traffix](assets/images/2018-05-03/zap_1.png)

But was this all necessary? Turns out that not really.
You may use your vanilla `HttpClient`:
{% highlight csharp %}
var restServiceUri = new Uri(configuration["RestServiceUri"]);
var httpClient = new HttpClient() {
    BaseAddress = restServiceUri
};
{% endhighlight %}
And then just set `http_proxy` environmental variable to get
exactly the same behaviour (without any need to modify `hosts`, or
to force REST service to listen on all interfaces).
Just run in Bash:
{% highlight no-highlight %}
http_proxy=http://localhost:8080 dotnet run
{% endhighlight %}

Since I don't have any machine with Windows/MacOS I cannot
confirm that it works on all OS'es, but at least it works
on my Ubuntu.

