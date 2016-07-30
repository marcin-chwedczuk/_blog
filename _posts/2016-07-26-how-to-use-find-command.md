---
layout: post
cover: 'assets/images/mc_cover3.jpg'
title: How to use find command
date:   2016-07-26 00:00:00
tags: linux 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Linux `find` command may be used to find files and directories
that meet specified conditions. The most popular
conditions test file size, filename and file type 
(do we want regular files, directories or both).
By default `find` prints paths to found files and directories but it can 
perform various operations on found files e.g. it may remove them.
In this article I will present how to use `find` and how to create complex
search conditions, so let's begin.

Generally `find` invocation looks like this:
{% highlight no-highlight %}
$ find startDirectory filterOrAction1 ... filterOrActionN
{% endhighlight %}
Here `startDirectory` is root of directories tree that we want to search.
After `startDirectory` we pass zero or more filters and/or actions.
Filters define conditions that given file/directory must meet, e.g. filter `-type f`
tells `find` that it should only process regular files and skip other file system
objects like directories or named pipes. Actions on the other hand define what
should be done with found files/directories, we may for example print 
their filenames using `-print` action or we may delete them via `-delete` action.

If you pass no arguments to `find` as in:
{% highlight no-highlight %}
$ find
{% endhighlight %}
it will assume that `startDirectory` is current directory and that you want to
print filenames of all found files/directories. In other words it will be equivalent to
invocation:
{% highlight no-highlight %}
$ find . -print
{% endhighlight %}

`find` performs search by enumerating all files and directories contained in
the `startDirectory`. For each file/directory `find` executes specified filters and
actions, from left to right and stops on the first filter or action that returns `false`.
Filters return `false` when filter condition is not met. Actions return `false` when
action ends with an error
e.g. user has insufficient permissions to remove file for `-delete` action.

Image below presents how `find dir -type f -name '*.java' -print` works
assuming that `dir` contains two files `foo.java` and `foo.cpp`:
![Illustration how find works](assets/images/2016-07-26/find1_2.svg)
To keep image size reasonable I skipped one more "file" that was checked by `find` in
our example - the `dir` directory itself. 

Before you proceed please answer the following questions 
(use `dir` directory from previous example). 
Verify your answers by running `find` and checking it's output:

* What will be printed by `find dir -print -print`?
* What will be printed by `find dir -print -name '*.java' -print`?
* What will happen when we specify no action like in `find dir -name 'foo*'`?

#### Filters

After reading previous section you should have firm understanding
how `find` works. Now let's move to describing most usefull filters
provided by `find`.

##### Type filter

We will start with `-type` filter that allows us to find 
filesystem objects that have specified type. 
For example to find only directories
we will use `-type d` and to find only regular files we will use `-type f`.
`-type` filter takes single parameter that is one letter abbreviation of 
filesystem object type.
All available values are presented in table below:

|-|
| Argument | Description |
|:-:|
| b | Block device e.g. `/dev/sda` on most modern systems |
| c | Character device e.g. `/dev/tty0` |
| d | Directory e.g. `/etc` |
| p | Named pipe |
| f | Regular file e.g. `/etc/profile` |
| l | Symbolic link |
| s | Socket |
|-|

##### Name filter

`-name` filter allows us to find files/directories that have names
that match specified pattern e.g. `*.java`. Only filename is checked 
against the pattern, rest
of the file path is ignored e.g. `./usr/foo` file doesn't match `u*foo` pattern, but
`./uberfoo` file does.
`-name` filter performs *case sensitive* comparisons so `foo` doesn't match `FOO` pattern,
to use case insensitive comparisons use `-iname` filter instead.

Inside name filter pattern some characters like `*` or expressions like `[abc]` have
special meaning (see [glob expression](https://en.wikipedia.org/wiki/Glob_(programming))).
Table below lists all special expressions that may be used inside patterns:

|-|-|-|
| Special character / expression | Meaning |
|:-:|-|-|
| `*` | Matches zero or more characters |
| `?` | Matches single character |
| `[abc]` | Character set. Matches any character in set |
| `[!abc]` | Inverted character set. Matches any character NOT in set |
| `[a-z]` | Character range. Matches any character in range |
| `[!a-z]` | Inverted character range. Matches any character NOT in range |
|-|-|

BE CAREFUL: It is always
good idea to quote patterns using single quotes to prevent shell expansion of the pattern

Examples:

* To find all java files we can use `-name '*.java'` filter
* To find all files that have three letter names we may use `-name '???'` filter
* To find all files that have names starting with `a`, `b` or `c` we can use `-name '[abc]*'` filter
* To find all files that have names that doesn't start with `1` we may use `-name '[!1]*'` filter

##### Size filter

`-size` filter can be used to search for files of given size, for example `find dir -size 1M` will find
all one megabyte files in `dir` directory. 

We may use `+` and `-` prefixes to
signify that we want files bigger or smaller than specified size e.g. `find dir -size +64k` will
find all files contained in `dir` directory that are bigger than 64 kilobytes.
Conversely `find dir -size -64k` will find all files in `dir` directory that are smaller than 64 kilobytes.

We may use popular `k`, `M`, `G` suffixes to signify kilo-, mega- and gigabytes, `c` suffix can be used to
specify file size in bytes.

##### Time filter

For every file filesystem tracks up to three times:

* `atime` or Access time - time when give file was last read
* `mtime` or Modification time - last time when contents of file changed
* `ctime` or Change time - last time when contents or attributes of file changed. 
 Here attributes refers to file metadata like filename or file permissions

To find all files that were modified exactly one day ago we may use `-mtime 1` filter.
And to find all files that were accessed exactly one minute ago we may use `-amin 1` filter.

First letter of these filters (`a`, `m` or `c`) signifies on what file time filter should operate,
next word (`time` or `min`) signifies in what time unit will be passed argument - we may use only
days or minutes.

As with size filter we may use `+` and `-` prefixes to signify that we want to find files
that were modified at most one day ago (`-mtime -1`) or at least one day ago (`-mtime +1`).

##### Permissions filter

`-perm` filter can be used to find files/dirs that have specific permissions set.

In the examples I will use octal notation for permissions e.g. `-perm 644` but `-perm` filter
also supports symbolic notation e.g. `-perm u=rw`.  
Here is quick remainder of the octal
notation:
{% highlight no-highlight %}
    owner  |  group  |  others
    r w x  |  r w x  |  r w x
    4 2 1  |  4 2 1  |  4 2 1
{% endhighlight %}

To find all files/dirs that have permissions set 
exactly to `644` we may use `find dir -perm 644`, this will find
all files/dirs that are readable/writable for file owner and readable for everyone else.

Often we want to find files that have *at least* specified permissions, to do so 
we must prefix permissions with minus sign (`-`) e.g. `-perm -644`.
Filter `-perm -644` will
find all files that are at least readable/writable for file owner and readable for everybody
else e.g. files with permissions `666`, `655` and `777` will be included.

Sometimes we want to find files that have a common permission bit with specified permission, 
to do this
we should prefix permissions with `/` character. For example to find files that have
*any* permission for others set we may use `find dir -perm /007`.

#### Actions

No let's see what we can do with found files. In this section I will describe most
popular actions used with `find`.

##### print and print0 actions

`-print` and `-print0` actions print on `stdout` path to found files.
Printed path is **relative** to `startDirectory` so:
{% highlight no-highlight %}
$ find dir -print
dir
dir/foo.java
dir/foo.cpp

$ find ./././dir -print
./././dir
./././dir/foo.java
./././dir/foo.cpp

$ readlink -f dir
/home/user/dir

$ find $(readlink -f dir) -print
/home/user/dir
/home/user/dir/foo.java
/home/user/dir/foo.cpp
{% endhighlight %}
In the last example I used `readlink` command to get absolute path to `dir` directory.

When we pipe `find` output to other programs like `xargs` we should definitely use `-print0`
action. The main difference between `-print` and `-print0` is that the last one
uses `NUL` character (`\0`) instead of new line to separate paths. 
This allows other tools to process
paths that contains spaces including new lines without problems. 
Here's how we use it with `xargs`:
{% highlight no-highlight %}
find dir -print0 | xargs -0 -n 1 echo
{% endhighlight %}
The important part is to pass `-0` or `--null` option to `xargs` so it will know that
we will separate paths using `NUL` character.

##### delete action

This action is pretty self-explanatory, you may use it to remove files.

WARNING: Please remember that `find` processes filters and actions from left to right so
if you you put `-delete` action first `find` will try to delete all found files and
directories before trying other filters/actions.

If the delete operation fail `-delete` will return `false`, otherwise it will
return `true`.

Example usage:
{% highlight no-highlight %}
$ find dir -name '*foo*' -delete
{% endhighlight %}

##### exec action

`-exec` is the most useful action that you can use with `find`. It allows you
to execute arbitrary command for each found file. 
You must pass command to execute after `-exec` argument and you must end it with
`;` character. 
Since semicolon has special meaning in the shell you must escape it using `\;` or `';'`.
Inside command you may use `{}` placeholder that will be replaced by the path to 
the found file before command execution.
`-exec` action returns `true` if executed command returned `0` exit code, otherwise
it will return `false`.

Let's see some examples:
{% highlight no-highlight %}
$ find dir -name 'foo*' -exec echo "found file: {}" ';'
found file: dir/foo.java
found file: dir/foo.cpp


$ ls -l dir/*
-rw-rw-r-- 1 user user 0 lip 30 11:22 dir/foo.cpp
-rw-rw-r-- 1 user user 0 lip 30 11:22 dir/foo.java

$ find dir -name 'foo*' -exec chmod o+w {} \;

$ ls -l dir/*
-rw-rw-rw- 1 user user 0 lip 30 11:22 dir/foo.cpp
-rw-rw-rw- 1 user user 0 lip 30 11:22 dir/foo.java
{% endhighlight %}

##### ok action

`-ok` is like `-exec` action with the exception that `find` will ask you
for confirmation before executing command:
{% highlight no-highlight %}
$ find dir -ok chmod o+w {} \;
< chmod ... dir > ? y
< chmod ... dir/foo.java > ? n
< chmod ... dir/a > ? n
< chmod ... dir/foo.cpp > ? y
< chmod ... dir/c > ? y
< chmod ... dir/b > ? n
< chmod ... dir/d > ? n
{% endhighlight %}

#### Advanced expressions

As we have seen `find` command is very versatile. We already know how to
create complex search conditions and how to execute actions for found files.
Yet we still don't know full power of `find`, now it's time to change that.

Let's start with simple example: we want to find all files in `dir` directory
that have names that  *doesn't* end with `.java`. 
It's impossible to do so with `-name` filter that we know. 
But if there was a way to negate a filter it would be simple, right?
In fact there is, just precede a filter with `!`
character to negate it (since `!` is special shell character we need to escape it e.g. `\!`). 
{% highlight no-highlight %}
$ tree dir
 dir
 |-- foo.cpp
 |-- foo.java
 `-- foo.py

$ find dir \! -name '*.java' -type f
dir/foo.py
dir/foo.cpp
{% endhighlight %}

Beside negation `find` also provides two other boolean operators: AND (`-a`) and OR (`-o`).
We may also use parentheses to group filters/actions into subexpressions
(as you probably guessed parentheses have special meaning in the shell and we must 
escape them e.g. `\(` or `')'`).

When `find` evaluates complex expressions it tries to 
[short-circuit](https://en.wikipedia.org/wiki/Short-circuit_evaluation) AND and OR
operators. Short-circuiting means that if the left 
operand of the AND is false right operand is not evaluated,
and if the left operand of OR is true the right operand is not evaluated. This is very
important when we mix filters with actions.
Let's see some examples that show us AND and OR operators in action:
{% highlight no-highlight %}
$ # find files ending with .cpp or .py
$ find dir \( -name '*.cpp' -o -name '*.py' \)
dir/foo.py
dir/foo.cpp

$ # print files once but directories twice
$ find dir \( -type f -a -print \) -o \( -type d -a -print -a -print \)
dir
dir
dir/foo.java
dir/foo.py
dir/foo.cpp

$ # this one is tricky, we remove all NON-DIRECTORIES
$ # e.g. files, pipes, sockets etc.
$ # here we use fact that OR operator short-circuit's
$ find dir -type d -o -delete
{% endhighlight %}

The last think to remember is that `\( filter1 -a filter2 -a filter3 \)` expression is 
equivalent to `\( filter1 filter2 filter3 \)`.

#### Other

Before we end I want to mention two handy options `-mindepth` and `-maxdepth` that
allow us to limit search depth to a specific range. Here's how to use them:
{% highlight no-highlight %}
$ mkdir -p dir/dir1/dir2/dir3/dir4

$ tree dir
 dir
 `-- dir1
     `-- dir2
         `-- dir3
             `-- dir4

$ find dir -mindepth 1 -maxdepth 3
dir/dir1
dir/dir1/dir2
dir/dir1/dir2/dir3

$ find dir
dir
dir/dir1
dir/dir1/dir2
dir/dir1/dir2/dir3
dir/dir1/dir2/dir3/dir4

{% endhighlight %}
Intuitively `mindepth`/`maxdepth` tells us how many `/` characters we want to have in file path.

#### `findform` application 

To help you quickly recall all most useful `find` options I created simple interactive
app that provides GUI for `find`, you may add it as a bookmark if you find it useful.

<a href="/assets/apps/findform/">Open FindFORM app</a>

That's all for today, thanks for reading!
