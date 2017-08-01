var url = require('url');
var fs = require('fs');
var mime;
module.exports = {
    routeHTTP : function(server, router, options){
        return module.exports.route(server, 'http', router, options || {});
    },
    routeHTTPS : function(server, router, options){
        return module.exports.route(server, 'https', router, options || {});
    },
    route : function(server, type, router, opts){
        server.options.handlers[type] = function(request, response){
            var uri = url.parse(request.url, true);
            var path = ((type == '!' && uri.pathname != '/')?uri.pathname+'.html':uri.pathname);
            if(path.lastIndexOf('?') != -1) path = path.substring(0, path.lastIndexOf('?'));
            var type = path.lastIndexOf('.') != -1 ? path.substring(path.lastIndexOf('.')+1) : '!';
            if(!type) return error('404', 'The requested resource does not exist.', request, response);
            var options = opts;
            var handle = function(cb){ if (cb) cb()};
            if(options.autoParseBody){
                handle = function(cb){
                    server.handleRequest('http', request, response, function(){
                        if(cb) cb();
                    });
                }
            }
            handle(function(){
                router.dispatch(request, response, function (err){
                    if(options.types && options.types.indexOf(type.toLowerCase()) !== -1){
                        fs.exists(process.cwd()+path, function(exists){
                            if(exists){
                                fs.readFile(process.cwd()+path, function (err, buffer){
                                    if(err){
                                        module.exports.error(err.message);
                                        return server.error('404', 'The requested resource could not be returned.', request, response);
                                    }
                                    if(!mime) mime = require('mime');
                                    var type = mime.lookup(path);
                                    response.setHeader("Content-Type", type);
                                    response.end(buffer.toString());
                                });
                            }else return server.error('404', 'The requested resource does not exist.', request, response);
                        });
                    }else{
                        return server.error('404', err.message, request, response);
                    }
                    if(options.verbose) console.log('FILE ' + request.url);
                });
            });
        }
    }
}
