whammo.js
==============

[![NPM version](https://img.shields.io/npm/v/whammo.svg)]()
[![npm](https://img.shields.io/npm/dt/whammo.svg)]()
[![Travis](https://img.shields.io/travis/khrome/whammo.svg)]()

**Experimental!**

I find what I really want is a lightweight library that can serve as the basis for a number of delivery strategies, and often found myself using http directly. But that tends to be very verbose, so I wanted something a little neater... but without assuming everything... so I built this. It handles request isolation, logging, errors, supports many complex configurations and handles everything with streams. This is a much more experimental version than previous releases... If this new streaming incarnation stabilizes, it will cease to be experimental.

While the *return* happens according to the precedence you set, it's important to note: the processing of all actions is in parallel streams, so work for this request is still being performed even during individual async waits.

Usage
-----

You express a server as a stack of operations, and the first one (by position) to produce output gets output to the user.

	var Server = require('whammo');

	application = new Server({
		actions : <action_list>
	});

This list uses director and handles GETs and POSTs the same way and dumps errors as parseable JSON.

	{ name : 'http-file', with:{
		types:['png', 'json', 'js', 'html', 'css']
	}},
	{ name : 'get-vars' },
	{ name : 'post-vars'},
	{ name : 'director-router', with : {
		routes : {
			'/test' : {get:function(){
				console.log(this.req);
				this.res.end('Got it!');
			}}
		}
	}},
	{ name : '404' , with : {json : true}}

This sample is a more traditional server with compression, conditional POST processing and HTML error output:

	{ name : 'http-file', with : { types : [
		'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html',
		'ttf', 'eot', 'woff', 'ico', 'otf', 'css', 'svg'
	]}, then: { name : 'compress'}},
	{ name : 'get-vars' },
	{ name : 'post-vars', when : { method : {'$eq':'POST'}}},
	{ name : 'director-router', with : {
		routes : {
			'/test' : { get : function(){
				this.res.end('Got it!');
			}}
		}
	}},
	{ name : '404', then: {name : 'compress'}}

Then, finally, you'll need to start the app:

	application.listen(8081);

Built-In Actions
----------------

In whammo each server is a stack of actions (ordered by precedence) which may then pipline to child actions. In this way, many complex configurations can be achieved through a simple set of operations. These actions can be conditionally enabled using the `when` field using [Mongo Query Document](https://docs.mongodb.com/manual/tutorial/query-documents/) syntax and link their output to other actions with `then` and can pass configuration options using `with`. Other fields are action specific.

- **http-file** : output any files that match provided types and exist
- **get-vars** : process GET vars and attach them to the request object
- **post-vars** : process POST vars and attach them to the request object
- **director-router** : use director to handle the provided routes
- **pagejs-router** : use pagejs to handle the provided routes
- **pack-js** : use webpack to deliver bundled js + dependencies (`/__bundle_js/<filepath>`)
- **404** : outputs a 404 page to the user
- **compress** : compress data as it streams through

Command Line[TBD]
------------

Precaching bundles for build or deployment

	whammo precache /path/to/my/file.js

Launch a server from a config file:

	whammo -c config.json

Roadmap
-------
- finish webpack support
- support short circuiting the stream(in some cases)
- support stream output
- mangrove integration


Testing
-------
Tests use mocha/should to execute the tests from root

    mocha

If you find any rough edges, please submit a bug!

Enjoy,

-Abbey Hawk Sparrow
