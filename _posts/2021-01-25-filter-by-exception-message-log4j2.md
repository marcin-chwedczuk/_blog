---
author: mc
layout: post
cover: 'assets/images/mc_cover4.jpg'
title: 'Filtering log lines using exception messages in log4j2'
date: 2021-01-25 00:00:01
tags: java jvmbloggers
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Recently I needed to filter out messages logged by a bit too verbose library.
This is not too difficult in log4j2 since we can attach filters at `Configuration`,
`Appender` and `Logger` levels:

{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
  <Filters>
    <!-- 
    (?s) - regex DOT matches all characters including new lines 
    -->
    <RegexFilter regex="(?s).*koopa.*" 
                 onMatch="DENY" onMismatch="NEUTRAL"/>
  </Filters>
  <Appenders>
    <Console name="stdout" target="SYSTEM_OUT">
      <Filters>
        <RegexFilter regex="(?s).*koopa.*" 
                     onMatch="DENY" onMismatch="NEUTRAL"/>
      </Filters>
      <PatternLayout pattern="%d %p [thread=%t][logger=%C] - %m%n"/>
    </Console>
  </Appenders>
  <Loggers>
    <Logger name="pl.marcinchwedczuk.ctftools.LoggingApp">
      <Filters>
        <RegexFilter regex="(?s).*koopa.*" 
                     onMatch="DENY" onMismatch="NEUTRAL"/>
      </Filters>
    </Logger>
    <Root level="DEBUG">
      <AppenderRef ref="stdout"/>
    </Root>
  </Loggers>
</Configuration>
{% endhighlight %}

This works well with both plain text and formatted log lines (e.g. `price = {}.`),
but is not sufficient if we want to filter by the messages of logged exceptions.

For example with the above configuration this code still prints `koopa` to stdout:
{% highlight java %}
logger.error("blah something bad happened", 
        new RuntimeException("koopa"));
{% endhighlight %}

The only solution to this problem that I have found is to create our own filter:
{% highlight java %}
package pl.marcinchwedczuk.ctftools.log4j2;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.Marker;
import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.config.Node;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;
import org.apache.logging.log4j.core.filter.AbstractFilter;
import org.apache.logging.log4j.message.Message;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Plugin(name = ExceptionMessageRegexFilter.FILTER_NAME,
    category = Node.CATEGORY,
    elementType = Filter.ELEMENT_TYPE,
    printObject = true)
public class ExceptionMessageRegexFilter extends AbstractFilter {
  static final String FILTER_NAME = "ExceptionMessageRegexFilter";

  private final Pattern pattern;

  private ExceptionMessageRegexFilter(
      Pattern pattern, Result onMatch, Result onMismatch)
  {
    super(onMatch, onMismatch);
    this.pattern = pattern;
  }

  @Override
  public Result filter(Logger logger, Level level,
             Marker marker, Object msg,
             Throwable t) {
    return doFilter(t);
  }

  @Override
  public Result filter(Logger logger, Level level,
             Marker marker, Message msg,
             Throwable t) {
    return doFilter(t);
  }

  @Override
  public Result filter(LogEvent event) {
    return doFilter(event.getThrown());
  }

  private Result doFilter(Throwable t) {
    if (t == null) {
      return onMismatch;
    }

    String msg = t.getMessage();
    if (msg == null) {
      return onMismatch;
    }

    final Matcher m = pattern.matcher(msg);
    return m.matches() ? onMatch : onMismatch;
  }

  @Override
  public String toString() {
    return String.format("pattern=%s", pattern);
  }

  @PluginFactory
  public static ExceptionMessageRegexFilter createFilter(
      @PluginAttribute("regex") String regex,
      @PluginAttribute("onMatch") Result match,
      @PluginAttribute("onMismatch") Result mismatch)
  {
    if (regex == null) {
      LOGGER.error("A regular expression must be provided for " 
        + FILTER_NAME);
      return null;
    }

    return new ExceptionMessageRegexFilter(
            Pattern.compile(regex), match, mismatch);
  }
}
{% endhighlight %}

The last thing to do is to use our filter in `log4j2.xml` file:
{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<Configuration packages="pl.marcinchwedczuk.ctftools.log4j2" 
               status="warn">
   <Loggers>
    <Logger name="pl.marcinchwedczuk.ctftools.LoggingApp">
      <Filters>
        <RegexFilter regex="(?s).*koopa.*" 
                     onMatch="DENY" onMismatch="NEUTRAL"/>
        <ExceptionMessageRegexFilter regex="(?s).*koopa.*" 
                                     onMatch="DENY" 
                                     onMismatch="NEUTRAL" />
      </Filters>
    </Logger>
  </Loggers>
</Configuration>
{% endhighlight %}

Two important things to notice here before we are done:

- We need to specify package containing our filter using `packages` attribute of `Configuration` XML element.
- To make filters composable we should use `NEUTRAL/DENY` or `NEUTRAL/ACCEPT` pair rather than `ACCEPT/DENY` in `onMatch` and `onMismatch` attributes.
