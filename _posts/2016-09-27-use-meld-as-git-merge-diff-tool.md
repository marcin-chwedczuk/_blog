---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: How to use Meld as git merge and diff tool
date:   2016-09-27 00:00:00
tags: git 
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

[Meld](http://meldmerge.org/) is a new open source merge tool written in Python, it has
a nice and fresh looking GUI so I decided to give it a chance and replace my old good KDiff...

![Meld before merge](/assets/images/2016-09-27/meld_before.png)
![Meld after merge](/assets/images/2016-09-27/meld_after.png)

Since git configuration of Meld isn't as straightforward as it should be,
here are relevant parts of my `.gitconfig`:
{% highlight no-highlight %}
# ------------------ M E R G E -------------------------
[merge]
    tool = meld

[mergetool "meld"]
    cmd = meld --auto-merge \"$LOCAL\" \"$BASE\" \"$REMOTE\" --output \"$MERGED\" --label \"MERGE (REMOTE BASE MY)\"
    trustExitCode = false

[mergetool]
    # don't ask if we want to skip merge
    prompt = false

    # don't create backup *.orig files
    keepBackup = false

# ------------------ D I F F -------------------------
[diff]
    guitool = meld

[difftool "meld"]
    cmd = meld \"$LOCAL\" \"$REMOTE\" --label \"DIFF (ORIGINAL MY)\"
{% endhighlight %}
You may edit your git config file by issuing `git config --global -e` command.
Before making any changes remember to create a backup.

Above configuration should work on any Linux, for Windows you must replace `meld` command
by absolute path to Meld: `\"C:/Program Files (x86)/Meld/Meld.exe\"` (`\"` are part of the path).

Happy merging!
