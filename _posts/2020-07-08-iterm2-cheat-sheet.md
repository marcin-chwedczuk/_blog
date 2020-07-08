---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: iTerm2 cheat sheet
date: 2020-07-08 00:00:01
tags: cheatsheet
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

iTerm2 is one of the best terminal emulators out there.
But to appreciate its full power you should know how to
use it effectively.
Here are shortcuts that I find indispensible while working with iTerm2.

#### Working with panes

* `Command + D` - Split vertically
* `Command + Shift + D` - Split horizontally
* `Command + W` - Close pane

* `Command + Option + Arrows` - Navigate between panes
* `Control + Command + Arrow` - Resize current pane
* `Command + Shift + Enter` - Maximize current pane / Restore its original size

* `Command + K` - Clear current pane

#### Text editing

* `Control + A` - Move to the line beginning
* `Control + E` - Move to the line end

Consider enabling "Natural Text Editing" (instructions [here](https://apple.stackexchange.com/a/293988))
if you want to use `Option + Left/Right Arrow` for
one word forward/backward navigation instead of
awkward `Control+] F` / `Esc F` (Escape followed by F for forward or
B for backward).

* `Option + Delete` - Delete one world
* `Command + Delete` - Delete entire line

#### Scrolling

* `Fn + Shift + Up Arrow` - Page Up
* `Fn + Shift + Down Arrow` - Page Down

#### Tabs

* `Command + T` - Create new tab
* `Command + <num>` - Move to `num`th tab e.g. `Command + 3`
* `Command + Left/Right arrow` - Move to left/right tab
* `Command + Option + W` - Close tab

Add the following function to your `~/.profile`:
{% highlight bash %}
title() {
	echo -ne "\e]1;$@\a"
}
{% endhighlight %}
Then you can use `title foo` to set iTerm2 tab title.

#### iTerm2 Window

* `Command + Enter` - Enter / Leave full screen mode
* `Command + ,` - Show preferences

#### History search

* `Control + R` - Start history search (fuzzy search)
* `Control + R` - Move to the next suggestions

#### Other

* `Command + ;` - Open graphical autocomplete menu in iTerm2
* Use `open URL` command to open given file in MacOS e.g. `open 'https://google.com'` or `open .` to open current directory in Finder