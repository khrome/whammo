micro-serve.js
==============
I found all the usual suspects gave me a bunch of cruft I may (or may not) use when what I really wanted was a lightweight library that could serve as the basis for a number of delivery strategies. Thus micro-serve was born. It handles request isolation, logging, errors and uses handlers registered against the prototcol (IE: 'http'). It supports https as well as sockets(via socket.io for now), but pretty much nothing else.

Usage
-----

This sample uses director, but it is just as easy to use page.js or any other router (or your own)

	var Server = require('micro-serve');
	var directorAdapter = require('micro-serve/routers/director');
    var director = require('director');
    
    var application = new Server();
    
    var router = new director.http.Router({
        '/test' : {
	        get:function(){
	            this.res.end('Hello World');
	        }
        }
    });
    
    directorAdapter.routeHTTP(application, router);
    application.listen(8081);

Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow