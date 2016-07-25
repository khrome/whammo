var should = require("should");
var Server = require('./server');
var request = require('request');

var application;
var port = '8081';

describe('micro-serve', function(){
    
    describe('runs a simple server', function(){
        
        before(function(){
            var directorAdapter = require('./routers/director');
            var director = require('director');
            
            application = new Server();
            
            var router = new director.http.Router({
                '/test' : {get:function(){
                    this.res.end('Got it!');
                }}
            });
            
            directorAdapter.routeHTTP(application, router);
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
                body.indexOf('<h2>404 Error</h2>').should.not.equal(-1);
                body.indexOf('<p>Could not find path: /miss</p>').should.not.equal(-1);
                req.statusCode.should.equal(404);
                done();
            });
        });
        
        after(function(){
            //application.stop();
        });
    });
    
});
