---
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: How to use grep command
date:   2016-08-20 00:00:00
tags: linux 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

`grep` is a command line program that allows us to find all occurrences of given pattern
in the text.
We can use `grep` to search command standard output, for example:
{% highlight no-highlight %}
$ # grep will print lines containing "eth0" phrase
$ ifconfig | grep eth0
eth0      Link encap:Ethernet  HWaddr xx:xx:xx:xx:xx:xx
        
$ cat /usr/share/dict/words | grep nerd
nerd
nerd's
nerdier
(...)
{% endhighlight %}
We may also use `grep` to find given pattern in the set of text files:
{% highlight no-highlight %}
$ cat > foo.txt <<EOF
foo
FOO
foobar
xfoox
in the middle of the line foo is
EOF
    
$ # search for foo in foo.txt file
$ grep foo foo.txt
foo
foobar
(...)
        
$ cat > bar.txt <<EOF
bar
Bar
foobar
EOF
    
$ # search for foo in foo.txt and bar.txt 
$ grep foo {foo,bar}.txt
foo.txt:foo
(...)
bar.txt:foobar
{% endhighlight %}
NOTE: In the last example I used 
[heredoc's](http://tldp.org/LDP/abs/html/here-docs.html) to create `foo.txt` and
`bar.txt` files.   
NOTE: `{foo,bar}.txt` is expanded by bash into `foo.txt bar.txt`, this is
called [brace expansion](https://en.wikipedia.org/wiki/Bash_(Unix_shell)#Brace_expansion).  

We may also peform recursive searches using `-r` or `-R` options (`grep` will search in
every file contained in the specified directory and it's subdirectories):
{% highlight no-highlight %}
$ tree grep_exercises/
grep_exercises/
  |-- bar.txt
  `-- foo.txt
     
$ grep -r foo grep_exercises/
grep_exercises/bar.txt:foobar
grep_exercises/foo.txt:foo
(...)
{% endhighlight %}

#### grep command in details

General `grep` invocation has form:
{% highlight no-highlight %}
$ grep [options] pattern [files|directories]
{% endhighlight %}
`grep` searches standard input when no files were given or
specified files/directories for occurrences of the `pattern`.
When `grep` finds a line that contains the `pattern` it prints it to
the standard output.
When we search multiple files each printed line
is prefixed by a filename.

##### -i (-\-ignore-case)
By default `grep` is case sensitive, so pattern `foo` doesn't match
word `FOO`, we can perform case insensitive search using `-i` option:
{% highlight no-highlight %}
$ grep bar bar.txt
bar
foobar

$ grep -i bar bar.txt
bar
Bar
foobar
{% endhighlight %}

##### -v (-\-invert-match)

We can use `-v` option to negate search, that is to print
all lines that don't contain given pattern:
{% highlight no-highlight %}
$ cat bar.txt 
bar
Bar
foobar

$ grep -v foo bar.txt 
bar
Bar
{% endhighlight %}

##### -r and -R

Both options can be used to perform recursive searches, the only difference
is that `-R` will follow 
[symbolic links](https://en.wikipedia.org/wiki/Symbolic_link#POSIX_and_Unix-like_operating_systems)
during search while `-r` won't.

When we are performing recursive search often 
we want to exclude some directory from search e.g. 
`.git` directory when we are searching inside GIT repository,
`--exclude-dir` option allows us to do exactly that:
{% highlight no-highlight %}
$ # create git repository
$ git init; git add *.txt; git commit -m 'foo';
$ grep -r foo .
./bar.txt:foobar
./foo.txt:foo
./foo.txt:foobar
./foo.txt:xfoox
./foo.txt:in the middle of the line foo is
Binary file ./.git/index matches
./.git/logs/refs/heads/master:00000000000...
./.git/logs/HEAD:000000000000000000000000...
./.git/COMMIT_EDITMSG:foo

$ grep -r foo --exclude-dir=.git .
./bar.txt:foobar
./foo.txt:foo
./foo.txt:foobar
./foo.txt:xfoox
./foo.txt:in the middle of the line foo is
{% endhighlight %}

We may limit set of files that will be searched during recursive search using
`--include`/`--exclude` options. Both of these options take 
[shell GLOB](https://en.wikipedia.org/wiki/Glob_(programming)#Unix) as an argument.
`--include` will force `grep` to check only files that match GLOB.
`--exclude` will force `grep` to skip any files that don't match GLOB.
For example to search for `foo` pattern only in `.txt` files we may use command:
{% highlight no-highlight %}
$ grep -r --include='*.txt' .
bar.txt:bar
bar.txt:Bar
bar.txt:foobar
foo.txt:foo
(...)
{% endhighlight %}

Another useful option when performing recursive searches is `-I`, it tells
`grep` to skip binary files when looking for the pattern.

##### -w (-\-word-regexp)

Sometime we want to match only whole words e.g. when we search for `foo` we don't
want matches like `foobar` or `xfoox`. `-w` option will force `grep` to perform
whole word search:
{% highlight no-highlight %}
$ grep foo foo.txt
foo
foobar
xfoox
in the middle of the line foo is

$ grep -w foo foo.txt
foo
in the middle of the line foo is
{% endhighlight %}

##### -c (-\-count)
`-c` option allow us to count number of occurrences of the pattern
inside searched files:
{% highlight no-highlight %}
$ grep -c foo foo.txt
4

$ grep -c foo *.txt
bar.txt:1
foo.txt:4
{% endhighlight %}

##### -n (-\-line-number)

`-n` option will force `grep` to prefix each found line with line number:
{% highlight no-highlight %}
$ grep -rn foo grep_exercises/
grep_exercises/bar.txt:3:foobar
grep_exercises/foo.txt:1:foo
grep_exercises/foo.txt:3:foobar
grep_exercises/foo.txt:4:xfoox
grep_exercises/foo.txt:5:in the middle of the line foo is
{% endhighlight %}

##### -l (-\-files-with-matches), -L (-\-files-without-match)

`-l` option will force `grep` to print only filenames of files that contain given pattern
instead of printing lines:
{% highlight no-highlight %}
$ grep -rl foo grep_exercises/
grep_exercises/bar.txt
grep_exercises/foo.txt
{% endhighlight %}
The is also `-L` option that will print only filenames of files that 
doesn't contain specified pattern.

##### -h (-\-no-filename), -H (-\-with-filename)

`-h` option will prevent printing of filenames when performing multifile search.
Similarly `-H` option will force `grep` to always print filenames:
{% highlight no-highlight %}
$ grep -H foo foo.txt 
foo.txt:foo
foo.txt:foobar
foo.txt:xfoox
foo.txt:in the middle of the line foo is
{% endhighlight %}

##### -A (-\-after-context), -B (-\-before-context) and -C (-\-context)
`-A`, `-B` and `-C` options allow us to print not only lines containing pattern
but also specified number of lines after (A) and before (B) them. `-C` option is
a shortcut to set both `-A` and `-B` to the same value:
{% highlight no-highlight %}
$ grep -B 1 -A 2 -w my /usr/share/dict/words
muzzling
my
myna
myna's
{% endhighlight %}

#### Basic regular expressions (BRE)

By default `grep` interpret pattern as a basic regular expression (BRE).
BREs are similar to shell GLOBs but are more powerful. Inside BRE we may use
the following special characters:

| Character/Expression | Meaning |
|:-:|-|
| `.` | Matches any single character |
| `*` | Matches zero or more repetitions of previous character or group |
| `[abc]` | Bracket expression matches single character. `[abc]` matches any of the characters `a`, `b` or `c`. `[0-9]` matches any digit. `[^abc]` matches any character that is *not* `a`, `b` or `c`. `[0-9abcdef]` matches any lowercase hex digit. Finally we can use character classes inside bracket expressions e.g. `[[:digit:]]` |
| `^` | Matches beginning of the line |
| `$` | Matches end of the line |

Any of the special characters used in BRE may be escaped by preceding 
them with a backslash (`\`).

OK, now let's see BRE in action:
{% highlight no-highlight %}
$ # first we will find all words that ends with 'cat'
$ grep 'cat$' /usr/share/dict/words
Muscat
bobcat
cat
(...)

$ # now let's find all 5 letter words in which second letter is
$ # a, e or i
$ grep '^.[aei]...$' /usr/share/dict/words | head
Aaron
Aesop
Aiken
(...)

$ # and let's finish by finding all hex numbers in the text
$ # we will assume that hex numbers have format 0xaabbcc
$ cat /proc/cpuinfo | grep '0x[0-9a-f]*'
microcode   : 0x9
microcode   : 0x9
(...)
{% endhighlight %}

BRE are even more powerful if we use grouping and more advanced operators.
Let's start with grouping, we may create groups by surrounding parts of the pattern
with `\(...\)`, then we may apply e.g. `*` to the entire group. For example to find
all words that have even number of characters we may write:
{% highlight no-highlight %}
$ grep '^\([a-z][a-z]\)*$' /usr/share/dict/words | head
aardvark
abacus
abacuses
(...)
{% endhighlight %}
This works because we are telling `grep` that we want to find any
number of repetitions of *pair of characters*.

Sometime we search for pattern like phone number that have fixed number
of digits in each part, we may use `\{...\}` operator to specify exact number
of repetitions of previous character or group:

| Expression | Meaning |
|:-:|-|
| `\{m\}` | Matches `m` repetitions of previous character or group e.g. `a{3}` matches `aaa` but not `aa` or `abc`. |
| `\{m,\}` | Matches at least `m` repetitions of previous character or group e.g. `a{2}` matches `aa`, `aaa` but not `a`. |
| `\{m,n\}` | Matches at least `m` and at most `n` repetitions of of previous character or group. |

For example to search for phone number in format `XXX-XX-XXXX` we will `grep`:
{% highlight no-highlight %}
$ grep '[0-9]\{3\}-[0-9]\{2\}-[0-9]\{4\}' file
{% endhighlight %}

The last thing worth know about BRE is the possibility to use backreferences.
For example let's say that we search for all five letters palindromes, we may use
`\1`, `\2`, etc. placeholders to tell `grep` that we expect text that was matched by first group,
second group etc. in the place of placeholders:
{% highlight no-highlight %}
$ grep '^\(.\)\(.\).\2\1$' /usr/share/dict/words | head
civic
kayak
level
(...)
{% endhighlight %}

NOTE: Sometimes we just want to search using old plain text pattern, we may disable BRE
using `-F` grep option.

I didn't described all BRE features, if you are interested in details
please [check the standard](http://pubs.opengroup.org/onlinepubs/009696899/basedefs/xbd_chap09.html#tag_09_03).
IMHO BRE are ugly and cumbersome to use, in the next
section I will quickly describe extended regular expressions that bring full power of
regexes to `grep`.

#### Extended regular expressions (ERE)

To enable extended regular expressions we must pass `-E` (`--extended-regexp`)
option to `grep`. ERE are similar to BRE with the exception that we don't need to
precede operators such as grouping with backslashes. To create a group in ERE 
we simply use `(foo)` pattern, and to specify number of matches for that group
we use `(foo){3}` pattern.
This looks *much* more cleaner compared to BRE `\(foo\)\{3\}`.

If we want to match
e.g. left parenthesis we need to escape it using backslash, for example to match `main()` text we
could use `main\(\)` pattern (or we could use `-F` option to match text as it is).

In ERE in addition to all special characters from BRE we may use:

| Character/Expression | Meaning |
|:-:|-|
| `+` | Matches one or more repetitions of previous character or group |
| `?` | Matches zero or one occurrences of previous character or group |
| `|` | Alternation - allows to match one of the specified patterns from set e.g. `0(x|X)` will match `0x` and `0X` texts |

Now let's see some examples of ERE in action:
{% highlight no-highlight %}
$ # let's find all phone numbers in format XXXX-XX-XXX that may
$ # be optionally prefixed by country code (+XX)
$ grep -E '(\(\+[0-9]{2}\) )?[0-9]{4}-[0-9]{2}-[0-9]{3}' file

$ # let's find all percent values in the text
$ grep -E '[0-9]+%' file

$ # let's find all email addresses, here we use -o option
$ # to print only matched text
$ grep -E -o '[A-Za-z0-9._]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}' file
{% endhighlight %}

Most modern versions of `grep` support even more powerful versions of regular expressions
that include shortcuts for character classes like `\d` for `[0-9]` and `\D` for `[^0-9]` and more
advanced anchors like `\b` (matches word start or end).
Check your local version of `grep` to find out what features are available.

That's all that I wanted to say about `grep` command. Happy grepping!

