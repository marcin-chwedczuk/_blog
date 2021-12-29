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

iTerm2 is one of the best terminal emulators for macOS.
But to appreciate its full power you should know how to
use it effectively.
Here are shortcuts that I find indispensable while working with iTerm2.

#### Working with panes

* `Command + D` - Split vertically
* `Command + Shift + D` - Split horizontally
* `Command + W` - Close pane

* `Command + Option + Arrows` - Navigate between panes
* `Control + Command + Arrow` - Resize current pane
* `Command + Shift + Enter` - Maximize current pane / Restore its original size

* `Command + K` - Clear current pane (this one comes with bash/zsh and also works on Linux)

#### Text editing

* `Control + A` - Go to the beginning of line
* `Control + E` - Go to the end of line

* `Option + Delete` - Delete one world
* `Command + Delete` - Delete entire line

Consider enabling "Natural Text Editing"
if you want to use `Option + Left/Right Arrow` for
one word forward/backward navigation instead of
awkward `Control+] F` / `Esc F` (Escape followed by F for forward or
B for backward).

##### Enabling Natural Text Editing

Press `Command + ,` to open Preferences dialog:
![Preferences dialog](assets/images/2020-07-08/prefs.png)
Go to the Profiles tab.

 Create a copy of your current profile by choosing Other actions... dropdown
 at the bottom of the profile list and selecting Duplicate profile
 menu option. Then go to Keys
-> Presets... and choose "Natural Text Editing":
![Enable Natural Text Editing](assets/images/2020-07-08/setnte.png)
Set your newly created profile as Default:
![Set Default Profile](assets/images/2020-07-08/setdef.png)
Now your new profile should have a star prior to its name.

#### Scrolling

* `Fn + Shift + Up Arrow` - Page Up
* `Fn + Shift + Down Arrow` - Page Down

On external keyboard `Shift + Page Up/Down` will work too.

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
* `Control + R` - Move to the next suggestion

[Oh my ZSH](https://github.com/ohmyzsh/ohmyzsh) provides a better history management
based on up and down arrows. If you don't want to install Oh my ZSH, you may emulate
this behavior in ZSH by adding these lines to your `.zshrc`:
```
# make search up and down work, so partially type and hit up/down to find relevant stuff
bindkey '^[[A' up-line-or-search                                                
bindkey '^[[B' down-line-or-search
```
(thanks to github.com/ghprince user).

Now you just write the command beginning e.g. `vim ` and then you can cycle though all
completions based on the command history, using up and down arrows.

#### Other

* I highly recommend using ZSH with [Oh my ZSH](https://github.com/ohmyzsh/ohmyzsh) bundle.
 Check this amazing [post](https://code.joejag.com/2014/why-zsh.html) that summarizes most
 useful ZSH features.
* `Command + ,` - Open graphical autocomplete menu in iTerm2
* Use `open URL` command to open given file in MacOS e.g. `open 'https://google.com'` or `open .` to open current directory in Finder
* Use `pbcopy` to copy command output to the system clipboard e.g. `echo foo | pbcopy`