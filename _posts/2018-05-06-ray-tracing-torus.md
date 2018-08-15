---
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Ray tracing a torus
date: 2018-05-06 00:00:00
tags: algorithms 
subclass: 'post tag-test tag-content'
categories: 'mc'
navigation: True
logo: 'assets/images/home.png'
disqus: true
mathjax: true 
---

In this blog post I will show you how to ray trace a torus.
I will assume that you already know how to ray trace simple shapes
like spheres and cubes. I will also assume some basic familiarity
with shading and ray tracing in general.

### Obtaining torus equation

Before we start I must introduce some terminology.
I will use $$R$$ to denote torus major radius 
(the distance from the center of the tube to the center of the torus),
and $$r$$ to denote torus minor radius
(the radius of the tube). 
![Torus geometry](assets/images/2018-05-06/torusrR.png)

Let us consider torus $$T$$ centered at point 
$$(0,0,0)$$ with radiuses $$R$$ and $$r$$.
Torus $$T$$ can be defined as a set of points for which
certain function $$F$$ returns zero:

$$
	T = \{ p \in \mathbb{R}^3 \mid F(p) = 0 \}
$$

Our task will be to find a suitable definition of function $$F$$
that properly describes torus $$T$$.

We will start by looking at the intersection of torus $$T$$ with $$XY$$ plane:
![Torus-XY plane intersection](assets/images/2018-05-06/torus-def.svg)
Every point $$P=(x,y)$$ on the circumference of the 
right circle satisfies equation:

$$
(x - R)^2 + y^2 = r^2
$$

Now imagine that we are taking some point $$P$$ on the circumference
and we are rotating it around
$$Y$$ axis. 
![Rotating point around Y axis](assets/images/2018-05-06/torus-def2b.svg)
This way point $$P$$ becomes a set of points in 3D space:

$$
	P=(x,y,0) \Rightarrow \{(x',y,z') \in \mathbb{R}^3 | x'^2 + z'^2 = x^2 \}
$$

Torus can be obtained by rotating all points on the circumference
of the circle. In
other words points $$(x',y,z')$$ on the surface of a torus satisfy equations:

$$
\begin{cases}
(x - R)^2 + y^2 = r^2 \\
x'^2 + z'^2 = x^2 
\end{cases}
$$

This equations can be simplified by removal of $$x$$ variable into:

$$
(x'^2 + y^2 + z'^2)^2 - 2 (R^2 + r^2) (x'^2 + y^2 + z'^2) + 4 R^2 y^2 + (R^2 - r^2)^2 = 0
$$

And this is exactly what we were looking for, a suitable definition
for our function $$F$$. 
After a bit of renaming ($$x' \rightarrow x$$, $$z' \rightarrow z$$) 
we can write our final equation:

$$
F(x,y,z) = (x^2 + y^2 + z^2)^2 - 2 (R^2 + r^2) (x^2 + y^2 + z^2) + 4 R^2 y^2 + (R^2 - r^2)^2
$$

### Solving torus equation

Given ray definition:

$$
r(t) = o + \vec{d} * t
$$

$$
o = \begin{bmatrix}o_x\\o_y\\o_z\end{bmatrix}, \;
\vec{d} = \begin{bmatrix}d_x\\d_y\\d_z\end{bmatrix}
$$

where $$o$$ is the ray origin (starting point) 
and $$d$$ is a unit vector ($$ \left\lVert d \right\rVert = 1 $$) that
represents the ray direction,
we will try to find all positive ($$t > 0$$)
solutions to the equation:

$$
F(r(t)) = 0,\; t > 0
$$

Notice that for a particular ray this equation can have
0, 1, 2, 3 or 4 solutions:
![Visual illustration of number of the solutions](assets/images/2018-05-06/torus-sol4.svg)

We will start by substituting $$x, y, z$$ variables
by $$r(t)$$ point components 
in the formula of function $$F(x,y,z)$$:

$$
r(t) = \begin{bmatrix}r_x\\r_y\\r_z\end{bmatrix}
$$

$$
F(r_x,r_y,r_z) = (r_x^2 + r_y^2 + r_z^2)^2 - 2 (R^2 + r^2) (r_x^2 + r_y^2 + r_z^2) + 4 R^2 r_y^2 + (R^2 - r^2)^2
$$

And then we expand them to their full definition:

$$
r_x = o_x + d_x*t \\
r_y = o_y + d_y*t \\
r_z = o_z + d_z*t \\
$$

After long and tedious calculations and a lot of grouping and 
simplifications we finally get:

$$
F(r(t)) = c_4 t^4 + c_3 t^3 + c_2 t^2 + c_1 t + c_0 = 0
$$

where

$$
\begin{cases}
c_4 = (d_x^2 + d_y^2 + d_z^2)^2 \\
c_3 = 4 (d_x^2 + d_y^2 + d_z^2) (o_x d_x + o_y d_y + o_z d_z) \\
c_2 = 2 (d_x^2 + d_y^2 + d_z^2) (o_x^2 + o_y^2 + o_z^2 - (r^2 + R^2)) + 4 (o_x d_x + o_y d_y + o_z d_z)^2 + 4 R^2 d_y^2 \\
c_1 = 4 (o_x^2 + o_y^2 + o_z^2 - (r^2 + R^2)) (o_x d_x + o_y d_y + o_z d_z) + 8 R^2 o_y d_y \\
c_0 = (o_x^2 + o_y^2 + o_z^2 - (r^2 + R^2))^2 - 4 R^2 (r^2 - o_y^2)
\end{cases}
$$

Since our equation is just a polynomial of 4th degree, we may use 
one of the standard algorithms to solve it. 
In my demo application I used algorithm from 
[Graphic Gems](http://a.co/abkZKRO) book, freely available at
[GitHub](https://github.com/erich666/GraphicsGems/blob/master/gems/Roots3And4.c).
But you are free to use any other algorithm. In particular 
[Numerical Recipes in C](http://www.nrbook.com/a/bookcpdf.php) 
book is a good source of numerical algorithms.

TIP: Unfortunately `Roots3And4.c` file from Graphic Gems (called `solver.js` 
in my demo app) is sparsely 
documented. If you want to know how finding roots of 4th
degree polynomial actually works please
read section from Wikipedia about 
[Ferrari method](https://en.wikipedia.org/wiki/Quartic_function#Ferrari's_solution),
but use second definition of the _resolvent cubic_ described in [this Wikipedia article](https://en.wikipedia.org/wiki/Resolvent_cubic#Second_definition).
With a bit of effort you should be able to follow and understand source
code of the solver then.

### Practical considerations

1. Currently we can only render tori centered at point $$(0,0,0)$$ and laying
 on $$XZ$$ plane. To obtain tori located at arbitrary points and/or in arbitrary
 positions,
 we must apply matrix transformations to the _ray_
 just before computing intersections with the torus surface.
 For example from the viewer point of view
 the results of the following operations are the same:
 translating ray by vector $$(0,2,0)$$,
 translating torus by vector $$(0,-2,0)$$.
 In my demo app this transformation is done in `RayTracer.js#rotationEnd`
 method. For more details please see _Ray Tracing from the Ground Up_ book.

2. Due to limited accuracy of the floating point computations
 artifacts may be seen when we use huge numerical values for torus radiuses.
 For the best results we should keep $$R,r < 10$$.
 If you need huge tori in your scenes please use
 ray transformation technique described in point (1) to scale 
 small tori as needed.

3. From performance point of view rendering a torus by solving its equation
 is slow. Rendering may be speed up considerably if we manage to avoid
 solving the equation altogether e.g. by using 
 [triangle meshes](https://en.wikipedia.org/wiki/Triangle_mesh).

#### Source code

As a part of preparations to write this post I created a
simple demo app that ray traces a torus:
![Demo application](assets/images/2018-05-06/demo-app-thumbnail.png)

Source code can be downloaded from
[this GitHub repository](https://github.com/marcin-chwedczuk/ray_tracing_torus_js).

Application is written in JavaScript.
To run demo app execute:
{% highlight no-highlight %}
$ cd path/to/ray_tracing_torus_js/repo
$ npm install
$ bower install
$ gulp serve
{% endhighlight %}
`npm install` command may take a while to finish, so please be patient.
Also notice that you have to had both `bower` and `gulp` installed
on you local machine to make this work. 
You can install them by executing:
{% highlight no-highlight %}
$ sudo npm install --global gulp-cli
$ sudo npm install --global bower
{% endhighlight %}

#### References

* Ray Tracing from the Ground Up, Kevin Suffern, [Buy on Amazon](http://a.co/c5YAorf)
* Wikipedia, [Torus entry](https://en.wikipedia.org/wiki/Torus)
* [Roots3And4.c from Graphic Gems](https://github.com/erich666/GraphicsGems/blob/master/gems/Roots3And4.c)

