---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Fun with AT commands and an old modem
date: 2019-09-21 00:00:01
tags: hacking
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently, while cleaning my flat, I found an old Huawei E3131
USB modem. I planed to throw it away, but then I reminded myself
that this simple device, as virtually all modems, supports a
primitive text based interface known as "AT commands".
And so I started thinking about
spending a few hours of my time
sending AT commands and figuring out what is actually
possible.
This post is the result of this few hours of hacking. Enjoy!

When I connected the modem to my PC it was immediately
recognized as both an USB Drive and an GSM modem.
Grepping through `dmesg` revealed that three serial port
terminals where created at `/dev/ttyUSB0`,
`/dev/ttyUSB1` and `/dev/ttyUSB2`:
{% highlight no-highlight %}
$ dmesg | grep tty
[29167.640728] usb 3-9: GSM modem (1-port) converter now attached to ttyUSB0
[29167.640808] usb 3-9: GSM modem (1-port) converter now attached to ttyUSB1
[29167.640861] usb 3-9: GSM modem (1-port) converter now attached to ttyUSB2
{% endhighlight %}
To be honest I expected only a single `tty` file...

Running `stty` command on `ttyUSB0` returned
some useful information, including
[baud rate](https://en.wikipedia.org/wiki/Symbol_rate):
{% highlight no-highlight %}
$ stty -F /dev/ttyUSB0
speed 9600 baud; line = 0;
eof = ^A; min = 1; time = 0;
-brkint -icrnl ixoff ixany -imaxbel
-opost -onlcr
-icanon -echo -echoe
{% endhighlight %}
`-` before an option name means that this option is disabled.
Explanations for all options can be found in `man stty`.
For example `-echo` means that the characters that we
are writing, are not visible on the screen.
That is not very comfortable but can be changed easily
(you can try it yourself in bash by executing `stty -echo`
to disable
and `stty echo` to enable echo).

To connect to `ttyUSB0` I used `minicom`:
{% highlight bash %}
sudo apt install minicom
{% endhighlight %}
We need to create a `minicom` configuration first.
For some reason `minicom` was not
able to save it's config file in my home directory and
insisted on saving it into `/etc/minicom/` and so I
have to run it with `sudo`:
{% highlight bash %}
sudo minicom -s
{% endhighlight %}

Configuring `minicom` is like a journey to 80s,
entire UI is text based:
![minicom main menu](/assets/images/2019-09-23/mc-main-menu.png)
First we need to go into "Serial port setup" section:
![minicom serial port setting](/assets/images/2019-09-23/mc-serial-port.png)
and change "Serial Device" to `/dev/ttyUSB0` 
(to do this press A, change the field value and press either 
Enter to save or Escape to cancel).
Then we need to change baud rate (press E):
![minicom baud rate setting](/assets/images/2019-09-23/mc-baud-rate.png)
On this screen press C and then Enter.
Next we need to go into "Screen and Keyboard" section and
enable echo (press Q) and then Enter:
![minicom screen and keyboard settings](/assets/images/2019-09-23/mc-scrn-kbd.png)
We need to enable *local* echo (on the minicom side)
because, as `stty` indicated
the serial port itself does not support it.

Then we need to return to the main menu (press Enter)
and select "Save setup as..." option. I saved
my config under `huawei2` name. Then we should choose
"Exit from Minicom". If you chose "Exit" use Ctrl+A
followed by X to exit.

Now we can start `minicom` without `sudo`:
{% highlight bash %}
minicom huawei2
{% endhighlight %}
and execute our first AT command which is just `AT`.
The modem should respons with `OK` if everything works:
![minicom working](/assets/images/2019-09-23/mc-w1.png)

To find out what options are supported by my
modem, I googled for "huawei e3131 at command interface specification"
and found a PDF document describing supported AT commands.
By the way AT commands are 
[de facto standard](https://en.wikipedia.org/wiki/De_facto_standard)
and could be used with any modem.

TIP: To exit `minicom` press Ctrl+A followed by X (must be upper case).

WARNING: In the following sections I assume that we
inserted a working SIM card into the modem.

#### Obtaining information from the modem

We can obtain a lot of information about our modem and
the SIM card just by running AT commands.
For example we may ask the modem for its phone number:
{% highlight no-highlight %}
AT+CNUM

+CNUM: "NUMER WLASNY","+48999123999",145

OK
{% endhighlight %}
("NUMER WLASNY" is "MY OWN NUMBER" in Polish),
or for its IMEI number:
{% highlight no-highlight %}
AT+CGSN

865459999999999

OK
{% endhighlight %}

To read a modem flag or a setting we need to run a command
in `AT+CMD?` format.
For example to obtain the character set used by the modem
we send `AT+CSCS?` command:
{% highlight no-highlight %}
AT+CSCS?

+CSCS: "IRA"

OK
{% endhighlight %}
To check what values are acceptable for this flag
we run a command in `AT+CMD=?` format:
{% highlight no-highlight %}
AT+CSCS=?

+CSCS: ("IRA","UCS2","GSM")

OK
{% endhighlight %}
And to set flag/setting value we execute 
a command in `AT+CMD=value` format like `AT+CSCS="GSM"`:
{% highlight no-highlight %}
AT+CSCS="GSM"

OK
AT+CSCS?

+CSCS: "GSM"

OK
{% endhighlight %}

Network signal strength can be checked using `AT+CSQ` command:
{% highlight no-highlight %}
AT+CSQ

+CSQ: 23,99

OK
{% endhighlight %}
The response has format `+CSQ: signal-strength, error-rate`.
Signal strength varies from 31 (very good)
to 0 (very poor / lack of signal).
In my case bit error rate is not supported (99) by the modem.

`AT+COPS` command allows us to check the
current network and to get a list of
the present networks:
{% highlight no-highlight %}
AT+COPS?

+COPS: 0,0,"Plus",0

OK
AT+COPS=?

+COPS: (2,"Plus","PLUS","26001",0),
 (1,"Plus","PLUS","26001",2),
 (3,"T-Mobile PL","T-Mobile PL","26002",2),
 (3,"Orange PL","Orange","26003",2),
 //... OUTPUT TRUNCATED

OK
{% endhighlight %}

#### Sending USSD codes

USSD codes (short codes) like "*100#" are quite useful,
we can use them to check money amount on our account or
to change the current tariff.
Let's see how to send them using AT commands.
First hurdle to overcome is 
the encoding used while sending an USSD code.
By default the codes must be encoded using
GSM7Bit encoding, which is not
related to 7-bit ASCII in any way.
I couldn't find any online encoder/decoder for this
encoding, but fortunatelly
I found a pice of code that does exactly what we want:
[MessagingUtils.java](https://github.com/bsimic0001/AegisWallet/blob/master/mobile/src/main/java/com/aegiswallet/utils/MessagingUtils.java)
And so I added a `main` method and pasted the code to 
[www.compilejava.net](https://www.compilejava.net/)
to obtain an online converter. 
You can see the final, "paste ready" code
[here](https://gist.github.com/marcin-chwedczuk/96f7f2a310ca416bed88a6dc10b7abc6).

Encoding `*100#` in GSM7Bit gives us `AA180C3602`.
Now we may issue our USSD request using `AT+CUSD` command:
{% highlight no-highlight %}
OK
AT+CUSD=1,"AA180C3602",15

OK

+CUSD: 0,"C135BD1E66BBF3A0393DEC06ADDF6E7A1844668741EE7ABB2CAF8368B85C2E97CBE572B91C48078AB160301094E97481966F37FD0DBA87F5EE3288FC0691DDE93048866BC1722D192C9603C5623A1A4D378301",15
{% endhighlight %}
`1` (first value in the request) means that we want to see the response,
`15` (the last value) is the encoding type that we are using.

Next we need to use our GSM7Bit decoder to obtain plain
text from the network response (in Polish):
{% highlight no-highlight %}
Aktualny stan konta dla numeru 48999999999 : 1,00 PLN.
Konto wazne do dnia 28-09-2019 11:44:30
{% endhighlight %}

#### Sending and receiving SMS

Our next step will be to send and to receive an SMS:
{% highlight no-highlight %}
AT+CMGF=1

OK
AT+CMGS="+48333666999"

> Hello, world!
+CMGS: 7

OK
{% endhighlight %}
Before we send a message we must switch to the text mode,
which can be done by issuing `AT+CMGF=1` command.
The default mode is the PDU mode, which requires
creating and parsing PDU binary frames.

To send an SMS `AT+CMGS="phone-number"` command is used.
After executing `AT+CMGS`, a command prompt (`>`) will
appear allowing us to write our message.
When we are done we press Ctrl+Z,
few seconds later the message will be delivered.

To list received and sent messages we can use `AT+CMGL`
command:
{% highlight no-highlight %}
AT+CMGL=?

+CMGL: ("REC UNREAD","REC READ","STO UNSENT","STO SENT","ALL")

OK
AT+CMGL="ALL"

+CMGL: 0,"REC READ","+48111222333",,"19/09/23,16:01:42+08"
 Pszczolka Maja

OK
{% endhighlight %}
Remember to run this command in the text mode (`AT+CMGF=1`),
otherwise you will see hex encoded binary PDU frames.

First value in the row is the message index (`0`).
We may use this index to either read the message:
{% highlight no-highlight %}
AT+CMGR=0

+CMGR: "REC READ","+48111222333",,"19/09/23,16:13:03+08"
 Pszczolka Maja
{% endhighlight %}
or to remove it:
{% highlight no-highlight %}
AT+CMGD=0

OK
AT+CMGL="ALL"

OK
{% endhighlight %}

#### Playing with the phone book entries

`AT+CPBR` command can be used to read SIM card phone book entries:
{% highlight no-highlight %}
AT+CPBR=?

+CPBR: (1-250),40,20

OK
AT+CPBR=1,10

+CPBR: 1,"*110#",129,"Obsluga konta"
+CPBR: 2,"112",129,"Nr.alarmowy112"
+CPBR: 3,"999",129,"Pogotowie Rat."
+CPBR: 4,"997",129,"Policja"
+CPBR: 5,"998",129,"Straz pozarna"
+CPBR: 6,"+48601100100",145,"WOPR"
+CPBR: 7,"+48601100300",145,"GOPR/TOPR"
+CPBR: 8,"+48601102601",145,"Biuro obslugi"
+CPBR: 9,"5555",129,"Zasil konto"
+CPBR: 10,"*100#",129,"Stan konta"
{% endhighlight %}
`AT+CPBR=?` returns supported range of indexes (`(1-250)`; some of them
may be empty), max. phone number length (`40`) and max.
entry name length (`20`).
Using this information we may read phone book entries using
`AT+CPBR=<<index-range>>` command.
When the phone number starts with `+` its type is `145`
otherwise its type is `129`.

Adding a phone book entry is very simple:
{% highlight no-highlight %}
AT+CPBW=25,"111222333",129,"foo"

OK
AT+CPBR=25

+CPBR: 25,"111222333",129,"foo"

OK
{% endhighlight %}
The same command can be used to remove a phone book entry:
{% highlight no-highlight %}
AT+CPBW=25

OK
AT+CPBR=25

+CME ERROR: 22
{% endhighlight %}

#### RING RING RING

AT commands can also be used to make and receive phone calls.
Voice is send/received in WAVE format.
Unfortunately I cannot obtain even a simplest `RING` notification
from my modem.


