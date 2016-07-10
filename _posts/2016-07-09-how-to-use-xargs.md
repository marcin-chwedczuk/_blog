---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: How to use xargs
date:   2016-07-09 00:00:00
tags: linux
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this blog post I will show you how to use `xargs` command line utility.

We will start by creating simple bash script `showargs` that prints all arguments
passed to it on command line:
{% highlight bash %}
#!/usr/bin/env bash

# echo -n option prints text without new line
echo -n "[ "
for arg in "$@"; do
    echo -n "{$arg} "
done
echo "]"
{% endhighlight %}
We must make this script executable by running `chmod +x showargs`.
Now we can check how it works:
{% highlight no-highlight %}
$ ./showargs 
[ ]

$ ./showargs a b c
[ {a} {b} {c} ]

$ ./showargs "foo bar" '#$%'
[ {foo bar} {#$%} ]

$ ./showargs 1 "foo bar" '()' blah
[ {1} {foo bar} {()} {blah} ]
{% endhighlight %}
As you can see invocation of `showargs` prints single line that starts with `[` and
ends with `]` character 
and contains all parameters passed to script surrounded by `{` and `}`
braces. This will help us to see if arguments with spaces are properly passed 
to our script.

#### How xargs work

When we run `xargs cmd` in the terminal, `xargs` first reads all
lines from standard input, then concatenates them using space character, then
it appends that concatenated input to `cmd` and finally it executes this
extended command in the shell. It may sound a bit complicated but it is
really a simple process:
![How xargs works](assets/images/2016-07-09/xargs_lines.svg)

Let's play a bit with `xargs` in the terminal.
We'll use `showargs` script to snoop arguments passed by `xargs` to the command.
{% highlight no-highlight %}
$ echo a b c d | xargs ./showargs
[ {a} {b} {c} {d} ]

$ cat example
a b c
d
e f
$ cat example | xargs ./showargs 
[ {a} {b} {c} {d} {e} {f} ]
{% endhighlight %}
As we can see it doesn't matter for `xargs` if arguments are on single line or in
many lines of input.
It also doesn't matter if arguments are separated by space, newline or tabs:
{% highlight no-highlight %}
$ echo -e "foo\nbar\n\n\t\tnyu"
foo
bar

                nyu

$ echo -e "foo\nbar\n\n\t\tnyu" | xargs ./showargs 
[ {foo} {bar} {nyu} ]
{% endhighlight %}

We must also know that `xargs` properly escapes special shell characters like `|` or `>`
when it builds command arguments:
{% highlight no-highlight %}
$ echo a '>' '|' d
a > | d

$ echo a '>' '|' d | xargs ./showargs 
[ {a} {>} {|} {d} ]
{% endhighlight %}
NOTE: Here I used single quotes to escape special characters in echo command, 
but you may also use backslash e.g. `\>`.

##### Custom argument separator (delimiter)

Sometimes it happens that arguments to the program are not separated by spaces but
e.g. by commas. By default `xargs` treats 
[whitespace](https://en.wikipedia.org/wiki/Whitespace_character) 
as argument separators but this can
be changed by using `-d` option:
{% highlight no-highlight %}
$ echo foo,bar,nyu | xargs ./showargs 
[ {foo,bar,nyu} ]

$ echo foo,bar,nyu | xargs -d, ./showargs 
[ {foo} {bar} {nyu
} ]

$ echo -n foo,bar,nyu | xargs -d, ./showargs 
[ {foo} {bar} {nyu} ]

$ echo foo,bar,nyu | head -c -1 | xargs -d, ./showargs 
[ {foo} {bar} {nyu} ]

$ echo foo,bar,,nyu | head -c -1 | xargs -d, ./showargs 
[ {foo} {bar} {} {nyu} ]
{% endhighlight %}
Now `xargs` splits arguments on `,` character but we have encountered another problem.
When we split arguments on `,` the last newline is treated as part of the last argument.
We can fix this by preventing `echo` from printing newline with `-n` option, but this can
be a problem when we get input from a file. If we are sure that file always ends
with a newline we may truncate it using `head -c -1` command, that will print
all characters of standard input except last.

It's worth to notice that when we use nonstandard separators arguments can contain spaces:
{% highlight no-highlight %}
$ echo -n foo,bar a la baz,nya | xargs -d, ./showargs 
[ {foo} {bar a la baz} {nya} ]
{% endhighlight %}

Often we want to pass entire line from file as a single argument, we may easily
achive this with `xargs` by using newline as argument separator:
{% highlight no-highlight %}
$ cat example 
/foo/bar/file with space
/other-file
/dir with space/file

$ cat example | xargs -d\\n ./showargs 
[ {/foo/bar/file with space} {/other-file} {/dir with space/file} ]
{% endhighlight %}
NOTE: Here we used `\\` to escape `\` character in the shell, we may also use single quotes
as in `-d'\n'`

WARNING: Filenames in Unix can contain newline characters. Use this trick
only when you are sure that filenames in input file will not contain newlines.

##### Executing command per argument or per line of input

`xargs` have two modes of operation. We already know one of them: gather all arguments
and execute command. The other is to execute command per argument of per line of input,
as illustrated below:
![xargs 2nd mode of operation](assets/images/2016-07-09/xargs_many.svg)

We may execute command per fixed number of arguments by using `-n` option:
{% highlight no-highlight %}
$ echo a b c d | xargs -n1 ./showargs 
[ {a} ]
[ {b} ]
[ {c} ]
[ {d} ]

$ echo a b c d | xargs -n2 ./showargs 
[ {a} {b} ]
[ {c} {d} ]

$ echo a b c d | xargs -n3 ./showargs 
[ {a} {b} {c} ]
[ {d} ]
{% endhighlight %}
As we can see we may specify number of arguments that are needed by command.

WARNING: There may be not enough arguments for the
last command but `xargs` executes it anyway.

We may also execute command per fixed number of lines of input using `-L` option:
{% highlight no-highlight %}
$ cat example 
arg1 arg2 arg3
arg4
arg5 arg6

$ cat example | xargs -L1 ./showargs 
[ {arg1} {arg2} {arg3} ]
[ {arg4} ]
[ {arg5} {arg6} ]

$ cat example | xargs -L2 ./showargs 
[ {arg1} {arg2} {arg3} {arg4} ]
[ {arg5} {arg6} ]
{% endhighlight %}
As with `-n` option we must be careful when we execute command per more than one line 
of input because last command may not get
all needed arguments.

I personally find `-L1` option very useful but it doesn't work well with `-d` option.
{% highlight no-highlight %}
$ cat example 
arg1,"arg2 bar",arg3
arg4
arg5,arg6,arg7

$ cat example | xargs -L1 -d, ./showargs 
[ {arg1} ]
[ {"arg2 bar"} ]
[ {arg3
arg4
arg5} ]
[ {arg6} ]
[ {arg7
} ]

$ cat example | tr ',' ' ' |  xargs -L1 ./showargs 
[ {arg1} {arg2 bar} {arg3} ]
[ {arg4} ]
[ {arg5} {arg6} {arg7} ]
{% endhighlight %}
Here we used `tr` utility to convert `,` into spaces so we can avoid using `-d,` option.
As we can see `xargs` preserved spaces in arguments surrounded by double quotes (this
works with single quotes too).

##### Passing additional argument to the command

Sometimes we need to provide additional arguments to `xargs` command, we may do this
in a very simple way:
{% highlight no-highlight %}
$ echo a b c d | xargs ./showargs 
[ {a} {b} {c} {d} ]

$ echo a b c d | xargs ./showargs --long-arg -s
[ {--long-arg} {-s} {a} {b} {c} {d} ]
{% endhighlight %}
But what if our command expects arguments in format:
{% highlight no-highlight %}
some-command --input input-file --output output-file
{% endhighlight %}
To work with command like that we must use `xargs` `-I` option:
{% highlight no-highlight %}
$ cat example
/file1
/file with spaces
/file3

$ cat example | xargs -I{} ./showargs --input {} --output {}.processed
[ {--input} {/file1} {--output} {/file1.processed} ]
[ {--input} {/file with spaces} {--output} {/file with spaces.processed} ]
[ {--input} {/file3} {--output} {/file3.processed} ]
{% endhighlight %}
After `-I` we must provide placeholder string that will be replaced by actual
command arguments. People usually use `{}` but we may use any string:
{% highlight no-highlight %}
$ cat example | xargs -Ifoo ./showargs --input foo --output foo.processed
{% endhighlight %}

`-I` option is really useful but it doesn't work with `-n` option, so if you plan to use
`-I` you must process input line by line.

##### Other useful options

With `-p` option `xargs` will prompt for user approval
before executing command:
{% highlight no-highlight %}
$ touch file{1..3}

$ echo file{1..3}
file1 file2 file3
        
$ echo file{1..3} | xargs -n1 -p rm
rm file1 ?...y
rm file2 ?...n
rm file3 ?...y
        
$ ls file*
file2
{% endhighlight %}

`-0` or `--null` option is often used with `find` command to avoid problems
with filenames that contain spaces or other non alphanumeric characters.
`-0` option tells `xargs` that `\0` character will be used to separate arguments:
{% highlight no-highlight %}
$ touch file\ with\ space

$ ls file*
file with space

$ find -type f -name '*with*'
./file with space

$ find -type f -name '*with*' | xargs ./showargs 
[ {./file} {with} {space} ]

$ find -type f -name '*with*' -print0 | xargs -0 ./showargs 
[ {./file with space} ]
{% endhighlight %}
TIP: Always use `-print0` and `-0` options when working with `find`.

The last option that can be really useful is `-P`. This can be used to
execute commands in parallel:
{% highlight no-highlight %}
$ echo {1..9} | tr '[:digit:]' '1'
1 1 1 1 1 1 1 1 1

# takes 9 seconds
$ echo {1..9} | tr '[:digit:]' '1' | xargs -n1 sleep

# takes 3 seconds
$ echo {1..9} | tr '[:digit:]' '1' | xargs -n1 -P4 sleep
{% endhighlight %}
By default commands are executed sequentially (`-P1`).

I wasn't able to describe all `xargs` options, 
as usually you can find all of them on `xargs` manual page.

Thanks for reading!
