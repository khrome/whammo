var should = require("should");
var Server = require('./server');
var request = require('request');

var application;
var port = '8081';

describe('micro-serve', function(){

    describe('runs a simple server', function(){

        before(function(){
            application = new Server({
                actions : [
                    //first look for any static files
                    { name : 'http-file', types:[
                        'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
                        'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
                    ]},
                    // always load GET vars
                    { name : 'get-vars' },
                    // always load POST vars
                    { name : 'post-vars'},
                    { name : 'director-router', with : {
                        routes : {
                            '/test' : {get:function(){
                                this.res.end('Got it!');
                            }}
                        }
                    }},
                    { name : '404' }
                ]
            });
            application.listen(8081);
        });

        it('can find the test page on localhost', function(done){
            request('http://localhost:'+port+'/test', function(err, req, body){
                body.should.equal('Got it!');
                done();
            });
        });

        it('correctly misses a route and delivers an error', function(done){
            request('http://localhost:'+port+'/miss', function(err, req, body){
                body = body.toString();
                body.indexOf('<h1>404 Error</h1>').should.not.equal(-1);
                //body.indexOf('<p>Could not find path: /miss</p>').should.not.equal(-1);
                req.statusCode.should.equal(404);
                done();
            });
        });

        after(function(done){
            application.close(function(){
                done();
            });
        });
    });

    describe('compacts js (within 100 secs)', function(){
        this.timeout(100000)

        before(function(){
            application = new Server({
                actions : [
                    { name : 'pack-js'},
                    { name : '404' }
                ]
            });
            application.listen(8081);
        });

        /*it('can pack itself', function(done){
            request('http://localhost:'+port+'/__bundle_js/server.js', function(err, req, body){
                body = (body.toString && body.toString()) || body;
                console.log(body);
                done();
            });
        });*/

        after(function(done){
            application.close(function(){
                done();
            });
        });

    });

});
