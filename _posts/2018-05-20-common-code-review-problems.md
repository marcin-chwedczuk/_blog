---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Common code review problems
date: 2018-05-20 00:00:00
tags: programming 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

WARNING: WORK IN PROGRESS

In this post I will describe common code review problems
that I have seen throughout my professional career.

Problems were grouped into three categories: Continous integration,
Code review process and People. Continous integration contains
problems that may occur when you try to integrate code
review process into your existing CI pipeline.
Code review process category contains problems connected to code
review process itself. And finally People category contains problems
that may occur on a team level when you first introduce code review. 

I cannot call myself code review expert. I was only doing code
review for about two years. Still I belive that describing 
problems that I have encountered 
may help those that never did code review before and want 
to start practicing it. So here we go!

## Continuous integration

##### Problem 0: Not using any code review tool

Of course you may do code review by sitting at your
college desk and looking with him/her at `git diff` output.
But why? 
Tools like
[Gerrit](https://www.gerritcodereview.com/)
are free and comfortable to use. 
They allow you to attach comments to a single line of code, 
to track which problems are already resolved and which are not,
to invite other people and have a discution for each open issue,
and a lot more.
Just use a code review tool, that's it.

##### Problem 1: Code review is done after pull request was merged into master branch 

As you may expected, it is a bit too late for thorough code review.
For example assume that we are working with microservices,
and that your task was to expose a new REST endpoint. 
I assume that after your code was merged into master, it was automatically
build and deployed to the [development enviroment](https://en.wikipedia.org/wiki/Deployment_environment) (also called integration or ci environment).
So theoretically speaking someone may already be
using your new REST endpoint,
especially when that someone already waited for a long time for it.
Now if the reviewer will tell you that he come up with a better name
for one of the JSON fields, it will require more work to introduce that change
into codebase than it would have if the code review was done before merge
(you will have to create a separate commit; consumers of your API 
will have to be adjusted as well).

Conclusion: Always do a code review before code is merged into master.

##### Problem 2: Build is not performed on pull request before code review

All your pull requests should be build before code review starts.
First it will save peoples time - no need to review code that doesn't build
or code that fails some tests. Second you may perform e.g.
static code analysis during build and that may become 
a valuable input into code review process.

Conclusion: Do not start code review until pull request build passes. 

##### Problem 3: Comments from static code analysis tools do not show up into your code reivew tool

So you use tools like [SonarQube](https://www.sonarqube.org/) to perform
static code analysis on your code base but then you throw all
sugesstions and warning into some obscure `xml` file that can be downloaded
as a one of your build artifacts. Shame on you!
Publish all code quality and coding conventions warnings and
suggestions as a comments to your code review tool.
This way programmers will not forget to fix all automatically found issues.
Also this will save reviewers time because all simple issues like
breaking variable name convention will be detected by a tool. 

Jenkins [Sonar Gerrit plugin](https://wiki.jenkins.io/display/JENKINS/Sonar+Gerrit)
is a good example of free software that provides integration between
Jenkins CI, SonarQube and Gerrit.

##### Problem 4: Commit message is not reviewed

This problem occurs because either code review tool does not support
reviewing commit messages or nobody cares about reviewing it.
First case is simple to fix - just change your code review tool to
something better. In the second case your should try to persuade your
colleges that keeping commit messages 
clean and easy to understand could help them in the future.
After all commit messages are some form of the documentation.

You can find one of the best guides how to write a good
Git commit messages [here](https://chris.beams.io/posts/git-commit/).

##### Problem 5: Giant commits, multiple logical changes in the same commit

The bigger code change to review, the less effective code review becomes.
In other words avoid huge commits. And I mean it, no huge commits. Just NO.
A single commit should contain
only a single logical change to the codebase.

One techniqe that I use to split huge commits into smaller is to
extract refactorings into separate commits. 

## Code review process

##### Problem 6: Not clear, rude or cryptic comments

The first rule of code review is **don't be rude**. 
Yes, exactly that, be nice to your colleges.
This may not be as simple as it is, especially when you are
working in an international team where people may not speak 
English very well and where people come from different cultures.
For exaple I often hear a criticism of Poles that they are rude,
because they generally do not add "please" when they are 
making requests in English.
But that is only because in Polish language adding "please" to
every request
often seems childish. 
In Polish requests are considered polite by default,
no need to add please everywere.
Unfortunatelly this feature of Polish language seems to
be reflected in English spoken by Poles.
So please remember that comments may seems rude because either
reviewer have some troubles with English or because in his/her
culture the comment looks perfectly kind and something was lost in
translation.

So now I guess you know that you should be nice and also put
"please" here and there in your comments. But that is not all.
Your comments should also be clear and understandable.
Refering to coding conventions, standards and framework
documentation in your comments may help make your intentions clear.

