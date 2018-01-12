var fs = require('fs');
var Director = require('director').http;
var Emitter = require('extended-emitter');
//var BufferedResponse = require('../buffered-output-stream').Response;
var Response = require('http').ServerResponse;

var Router = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
    new Emitter().onto(this);
    var ob = this;
    this.waiting = {};
    this.router = new Director.Router(this.options.routes).configure({
        on : function(){
            ob.emit('routed', this.req);
            var dirSelf = this;
            Object.keys(ob.waiting).forEach(function(id){
                if(id === dirSelf.req.id){
                    var cb = ob.waiting[id];
                    delete ob.waiting[id];
                    cb();
                }
            })
        }
    });
}

Router.prototype.handle = function(stream, req, res, cb){
    stream.pipe = function(stream){ //hack to prevent auto-header gen on output
        stream.on('data', function(item){
            var fn = res['_writeRaw']?'_writeRaw':'write';
            res[fn](item);
        })
        return stream;
    }
    //director will try to do a direct dump, so let's intercept
    req.router = this.router;
    //response will buffer data expecting a socket, which never comes
    var response = new Response(req);
    var ob = this;
    this.waiting[req.id] = function(){
        // now that the response object has rendered headers and director thinks
        //it's dumped to the client, dump the output into the stream
        response.output.forEach(function(item){
            stream.write(item);
        });
        delete ob.waiting[req.id];
        cb(stream, true);
    };
    //todo: garbage collect
    this.router.dispatch(req, response, function(err){
        delete ob.waiting[req.id];
        cb();
    });
}

Router.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}

module.exports = Router;
