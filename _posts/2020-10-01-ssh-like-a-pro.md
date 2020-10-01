---
author: mc
layout: post
cover: 'assets/images/mc_cover9.jpeg'
title: 'SSH like a Pro'
date: 2020-10-01 00:00:01
tags: ssh jvmbloggers
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

In this post I gathered various tips and tricks can
will make you a more productive SSH user.

### Copying SSH keys to the server

A lot of beginners when faced with a problem of uploading their
public keys to the server, follow a manual process.
I will simulate this by trying to upload my public key to a Raspberry PI:
{% highlight bash %}
$ ssh pi@192.168.0.10
pi@192.168.0.10's password:

pi$ mkdir .ssh
pi$ vi .ssh/authorized_keys
pi$ # Append contents of key_rsa.pub to authorized_keys
pi$ ^D # Ctrl-D to end ssh session
{% endhighlight %}
Now I can connect to Raspberry PI using my private key:
{% highlight bash %}
$ # Let's load the private key so that we can use it
$ ssh-add ~/.ssh/pi_rsa

$ ssh pi@192.168.0.10
pi$
{% endhighlight %}
I was lucky, in my case everything worked but often it doesn't.
The main culprit usually, is a wrong access permission set on either `.ssh` directory
or `authorized_keys` file. Here is how the right permissions should look like:
{% highlight bash %}
pi@raspberrypi:~ $ ls -la .ssh
total 12
drwx------  2 pi pi 4096 Oct  1 10:09 .
drwxr-xr-x 17 pi pi 4096 Oct  1 10:09 ..
-rw-------  1 pi pi  574 Oct  1 10:09 authorized_keys
{% endhighlight %}

Pros do not think about permissions, nor they edit `authorized_keys` file manually.
Instead they use `ssh-copy-id` util that is part of the official SSH distribution.
{% highlight bash %}
$ ssh pi@192.168.0.10 'rm -rf ~/.ssh' # Let's reset everything
$ ssh-copy-id -i ~/.ssh/pi_rsa pi@192.168.0.10

$ ssh-add ~/.ssh/pi_rsa # Do not forget to load the key
$ ssh pi@192.168.0.10
{% endhighlight %}
One nice thing about `ssh-copy-id` is that it always uploads the public key,
even if you (like I in the example) specify private key on the command line.

### Keys management

`ssh-add` is a nice utility that manages currently active (loaded) private keys.
Loaded keys can be automatically used for authentication.

To load a key type:
{% highlight bash %}
$ ssh-add ~/.ssh/pi_rsa
{% endhighlight %}
Or just `ssh-add` to load `id_rsa`.

To list currently loaded keys:
{% highlight bash %}
$ ssh-add -l
{% endhighlight %}

To remove all keys:
{% highlight bash %}
$ ssh-add -D
{% endhighlight %}

When you connect to a remote machine you have an option to pass your currently
loaded keys along. This is called ssh agent forwarding and 
allows you to ssh into further machines using your private keys:
![Nested SSH connections](assets/images/2020-10-01/ssh1.svg)

For example without key forwarding I cannot log from my Raspberry PI to my PC:
{% highlight bash %}
mac$ ssh pi@192.168.0.10
pi$ ssh mc@192.168.0.2 # my PC
Password:
{% endhighlight %}
With key forwarding enabled (`-A`):
{% highlight bash %}
mac$ ssh -A pi@192.168.0.10
pi$ ssh mc@192.168.0.2 # my PC
pc$ # yay!
{% endhighlight %}
WARNING: You should only use forwarding when logging into servers that
you fully trust (see `man ssh` for details).

### Using ~/.ssh/config

Sometimes your user name is too long or hard to remember or maybe the server name is
or maybe your server uses a non-standard SSH port. Any of these can make typing the right ssh command
in the terminal very hard. But there is a nice solution to this, we just need to add an entry for
our server to `~/.ssh/config` file.

For example, for my `pi` machine I added the following entry:
{% highlight no-highlight %}
# this is comment
Host pi
        Hostname 192.168.0.10
        Port 22
        User pi
        IdentityFile ~/.ssh/pi_rsa
        ForwardAgent yes
        # or ForwardAgent no
{% endhighlight %}
Now I can ssh into it by simply typing:
{% highlight bash %}
mac$ ssh pi
pi$ 
{% endhighlight %}

### Copying files

`scp` command may be used to copy files both, from a server to the local machine:
{% highlight bash %}
# Assumes that we use pi alias
mac$ scp pi:./myfile.txt . 
# Without pi alias 
mac$ scp -P22 pi@192.168.0.10:./myfile.txt ./myfile.txt
{% endhighlight %}
Or from the local machine to the server:
{% highlight bash %}
# Assumes that we use pi alias
mac$ scp map.txt pi:./map2.txt
# Without pi alias
mac$ scp -P22 map.txt pi@192.168.0.10:./
# You may skip -P parameter if server is using default (22) port
{% endhighlight %}
TIP: If are going to transfer a big file remember to `gzip` it first.

For more complex scenarios you can use either `sftp` command:
{% highlight bash %}
mac$ sftp pi
Connected to pi.
sftp> ls # list files on the *server*
Bookshelf   Desktop     Documents   Downloads   Music       Pictures    Public
Templates   Videos      server_file.txt
sftp> get server_file.txt ./save_as_downloaded.txt
Fetching /home/pi/server_file.txt to ./save_as_downloaded.txt

sftp> put ./local_file.txt ./uploaded.txt
Uploading ./local_file.txt to /home/pi/./uploaded.txt

sftp> exit
{% endhighlight %}
or use command line file manager like `mc` (Midnight Commander):

1. Press `F9` to select menu bar and `R` to expand `Right` menu.
2. Select `SFTP link...`
3. Enter machine name (with or without using alias):

![MC with alias](assets/images/2020-10-01/mc1.svg)
![MC without alias](assets/images/2020-10-01/mc2.svg)

And then you may use standard `mc` commands to copy/move/modify files
on the server and local machine.

To exit SFTP mode just enter `..` in the top directory to which you `sftp`ed.

### Port forwarding

Let's say that there there is a service running on my Raspberry PI that is accessible only
via `localhost`. For example it can be a simple web server:
{% highlight bash %}
pi$ python3 -m http.server 7777 --bind 127.0.0.1 --directory .
{% endhighlight %}
Because server is listening only on `127.0.0.1` instead of `0.0.0.0`, 
we cannot access it from outside of my Raspberry PI:
{% highlight bash %}
% curl 192.168.0.10:7777
curl: (7) Failed to connect to 192.168.0.10 port 7777: Connection refused
{% endhighlight %}

To access the server we may e.g. forward connections to port 5432 on my laptop
to port 7777 on pi (this is called tunneling or port forwarding).
We can do this using SSH:
![SSH Tunnel](assets/images/2020-10-01/tunnel1.svg)
{% highlight bash %}
mac$ ssh -L localhost:5432:localhost:7777 pi
# In other terminal
mac$ curl localhost:5432
<html>
	<head></head>
	<body>
		Welcome on Raspberry PI!!!
	</body>
</html>
{% endhighlight %}
The general syntax is `-L local-machine:local-port:remote-machine:remote-port`.
Notice that for the `remote-machine` we have chosen `localhost`, but we could e.g.
chose other computer to which `pi` can connect. 
`local-machine` part can be omitted (`localhost` is the default). 

If you don't need the session only the tunnel, you can run `ssh` as a background task
(this will not be a shell background task, so it will not show up in `bg` command):
{% highlight bash %}
mac$ ssh -fN -L localhost:5432:localhost:7777 pi
mac$ ps | grep ssh
84851 ttys001    0:00.01 grep ssh
84290 ttys002    0:00.15 ssh pi
{% endhighlight %}

Port forwarding can also work in the opposite direction. We may make a service running on
my laptop accessible on Raspberry PI:
{% highlight bash %}
mac$ python3 -m http.server 9999 --bind 127.0.0.1 --directory .

# On PI
pi$ $ curl localhost:5432
curl: (7) Failed to connect to localhost port 5432: Connection refused

# On Mac
mac$ ssh -R localhost:5432:localhost:9999 pi
pi$ curl localhost:5432
<html>
	<head></head>
	<body>
		Hello from MacOS!!!
	</body>
</html>
{% endhighlight %}
Here syntax is `-R remote-machine:remote-port:local-machine:local-port`.
Connections to `remote-machine:remote-port` are forwarded to `local-machine:local-port`.

By default the open ports are available on `localhost` only (think security!).
If you want to accept connections from outside, you need to change 
`GatewayPorts` settings of sshd to `yes` on the server (machine to which you connect to):
{% highlight bash %}
pi$ sudo vi /etc/ssh/sshd_config
pi$ sudo service sshd restart
{% endhighlight %}
Now we can make `pi` accept connection from the entire local network and
forward them to my laptop:
{% highlight bash %}
# Establish tunnel
mac$ ssh -R '*:5432:localhost:9999' pi
# From my PC
pc$ curl raspberry_pi:5432
<html>
	<head></head>
	<body>
		Hello from MacOS!!!
	</body>
</html>
{% endhighlight %}
TIP: The single quotes are needed to prevent shell expansion of `*`.

### Providing internet connection via SSH

Say on your local machine you cannot access e.g. `facebook.com` for some strange reason.
But you noticed that on a certain server there is no such restriction 
and you can e.g. use `links` to browse `facebook.com`:
![Facebook in Links](assets/images/2020-10-01/fcrap.png)
Since FB does not looks good in `links` you really want something better...

Behold SSH comes to the rescue. By using a dynamic port forwarding we may establish
SOCKS tunnel to the server:
{% highlight bash %}
mac$ ssh -C -D 1080 pi 
{% endhighlight %}
`-C` is for compression, `1080` is the standard SOCKS port.

Now we need to configure a browser. Firefox is well known for excellent SOCKS support:
![SOCKS proxy configuration in Firefox](assets/images/2020-10-01/ff.png)
And voilà `facebook.com` is working again!

A trick like this was very popular when I was living in a dormitory.
Our dorm internet connection was very slow, but as CS students we had SSH access
to a few servers, some of them with very fast internet connections...

### X Forwarding

TODO

### Tmux session manager

TODO

### References

* https://www.cyberciti.biz/faq/create-ssh-config-file-on-linux-unix/
* http://www.trembath.co.za/mctutorial.html
* https://phoenixnap.com/kb/ssh-port-forwarding
* https://help.ubuntu.com/community/SSH/OpenSSH/PortForwarding
* https://linuxize.com/post/how-to-setup-ssh-socks-tunnel-for-private-browsing/