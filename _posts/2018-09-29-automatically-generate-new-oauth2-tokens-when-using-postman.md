---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Automatically generate new OAuth 2.0 access tokens when using Postman
date: 2018-09-29 00:00:00
tags: tips postman 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Did you ever try to use [Postman](https://www.getpostman.com/)
with OAuth 2.0 protected API? 
It is pretty annoying. 
First you must select the correct authorization type, 
then you must open a popup to request a new access token,
and only then you can send your HTTP request.
And of course when the token expires or when for some reason you need a
new one (e.g. because you want to switching from development to staging environment),
you need to go through the process again.
Fortunately for us this can be automated using Postman pre-request scripts.

To test that my pre-request script works I used publicly available 
[IdentityServer](http://identityserver.io/)
[demo instance](https://demo.identityserver.io/).
We may use it to manually generate a new access token and
to preform a test API call:
![Manually generating token 1](assets/images/2018-09-29/Postman_1.png)
![Manually generating token 2](assets/images/2018-09-29/Postman_2.png)
![Performing test API call](assets/images/2018-09-29/Postman_3.png)

OK, so how will we automate this stuff? Let's start by creating a new
collection that will contain all requests for which we want to automatically
generate OAuth access tokens:
![Create a new collection](assets/images/2018-09-29/Postman_4.png)
On Authorization tab use {% raw %}{{accessToken}}{% endraw %}
 as a value of the Access Token
field, this way Postman will try to load the token value from a variable:
![Set Access Token field](assets/images/2018-09-29/Postman_6.png)
We will populate this variable using the following pre-request script:
{% highlight javascript %}
// Adapted from: https://gist.github.com/harryi3t/dd5c61451206047db70710ff6174c3c1

let tokenUrl = 'https://demo.identityserver.io/connect/token';
let clientId = 'client';
let clientSecret = 'secret';
let scope = 'api'

let getTokenRequest = {
    method: 'POST',
    url: tokenUrl,
    auth: {
        type: "basic",
        basic: [
            { key: "username", value: clientId },
            { key: "password", value: clientSecret }
        ]
    },
    body: {
        mode: 'formdata',
        formdata: [
            { key: 'grant_type', value: 'client_credentials' },
            { key: 'scope', value: scope }
        ]
    }
};

pm.sendRequest(getTokenRequest, (err, response) => {
    let jsonResponse = response.json(),
        newAccessToken = jsonResponse.access_token;

    console.log({ err, jsonResponse, newAccessToken })

    pm.environment.set('accessToken', newAccessToken);
    pm.variables.set('accessToken', newAccessToken);
});
{% endhighlight %}
Which should be set on Pre-request Scripts tab:
![Set pre-request script](assets/images/2018-09-29/Postman_5.png)
Let's save all changes.

Now we must add a new request to our collection:
![Add a new request](assets/images/2018-09-29/Postman_7.png)
**This is very important.** Without this step our
pre-request script will not be called:
![Save the new request](assets/images/2018-09-29/Postman_8.png)
When creating the new request we should select "Inherit auth from parent"
as the authentication type.

Now if we send our test request we should get `200 OK` response:
![It works](assets/images/2018-09-29/Postman_9.png)

## Making our pre-request script work with multiple environments

Often we have to work with multiple environments like
development, staging (UAT) and production.
Each of these environments uses different URLs for services
and for OAuth authorization server. 
Not to mention that each environment will 
have its own set of client secrets (passwords).

Fortunately for us Postman has build in support for multiple environments.
Let's start by creating a new environment with all necessary values
that are needed by our pre-request script:
![Create a new environment](assets/images/2018-09-29/Postman_10.png)

Then we must modify our script to use values from the selected
environment:
{% highlight javascript %}
function getvar(variableName) {
    let value = pm.variables.get(variableName);
    if (!value) throw new Error(
        `Variable '${variableName}' is not defined. Do you forget to select an environment?`);
    return value;
}

let tokenUrl = getvar('tokenUrl');
let clientId = getvar('clientId');
let clientSecret = getvar('clientSecret');
let scope = getvar('scope'); 

// rest of the script is the same as before
{% endhighlight %}

And that is all. Now we must define all environments that
we need and we are ready to go:
![Sending request with environment set](assets/images/2018-09-29/Postman_11.png)

## Troubleshooting

Select `View -> Show Postman Console` to see all log statements
made by our pre-request script: 
![Postman Console](assets/images/2018-09-29/Postman_12.png)

Also using traffic sniffer like [Fiddler](https://www.telerik.com/fiddler)
or [ZAP](https://www.owasp.org/index.php/OWASP_Zed_Attack_Proxy_Project)
to compare requests made by auth popup and pre-request script may be helpful:
![ZAP](assets/images/2018-09-29/zap.png)

If you are going to use ZAP do not forget to set ZAP as a proxy in Postman settings.

