var url = require('url');
module.exports = {
    routeHTTP : function(server, router){
        return module.exports.route(server, 'http', router);
    },
    routeHTTPS : function(server, router){
        return module.exports.route(server, 'https', router);
    },
    route : function(server, type, router){
        server.options.handlers[type] = function(request, response){
            
            var uri = url.parse(request.url, true);
            var path = ((type == '!' && uri.pathname != '/')?uri.pathname+'.html':uri.pathname);
            var type = path.lastIndexOf('.') != -1 ? path.substring(path.lastIndexOf('.')+1) : '!';
            if(!type) return error('404', 'The requested resource does not exist.', request, response);
            router.dispatch(request, response, function (err) {
                if(err) return server.error('404', err.message, request, response);
                if(ob.options.types.indexOf(type.toLowerCase()) !== -1){
                    fs.exists(process.cwd()+path, function(exists){
                        if(exists){
                            fs.readFile(process.cwd()+path, function (err, buffer){
                                if(err){
                                    module.exports.error(err.message);
                                    return server.error('404', 'The requested resource could not be returned.', response);
                                }
                                var type = mime.lookup(path);
                                response.setHeader("Content-Type", type);
                                response.end(buffer.toString());
                            });
                        }else return server.error('404', 'The requested resource does not exist.', response);
                    });
                }else{
                    return server.error('500', 'There is no handler for protocol "'+protocol+'"', request, response);
                }
     
                console.log('Served ' + req.url);
            });
        }
    }
}