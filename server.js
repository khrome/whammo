#!/usr/bin/env node

//unassuming server wrapper
var arrays = require('async-arrays');
var fs = require('fs');
var vm = require('vm');
var qs = require('querystring');
var url = require('url');
var mime = require('mime');
var domain = require('domain');
var Emitter = require('extended-emitter');

/****************************************
    
    var server = new MicroServer({
        error_codes : {},
        router : 'director', // or fn
        socket : {port, transport},
    });
    server.start();
    var connectionType = server.serve({
        domain : true,
        log_level : 'error+warning',
        error_codes : {},
        port : 8080,
        template : '',
        typeHandlers : {}
    });
    connectionType.stop();


 ****************************************/

var defaultPage = '<html>'+
    '<head>'+
        '<title>{{title}}</title>'+
    '</head>'+
    '<body>'+
        '<h2>{{code}} Error</h2>'+
        '<p>{{message}}</p>'+
    '</body>'+
'</html>';

var Logger = require('./logger');
var ApplicationError = require('./error');

var Server = function(options){
    this.options = options || {};
    (new Emitter()).onto(this);
    if(!this.options.types){
        this.options.types = [
            'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
            'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
        ];
    }
    if(!this.options.handlers) this.options.handlers = {};
    var ob = this;
    if(this.options.handle) this.options.handle.forEach(function(type){
        switch(type.toLowerCase()){
            case 'http':
            case 'https':
                ob.options.handlers[type.toLowerCase()] = function(request, response, fallthrough){
                    var uri = url.parse(request.url, true);
                    console.log('REQ:', uri, path, type);
                    var path = ((type == '!' && uri.pathname != '/')?uri.pathname+'.html':uri.pathname);
                    var type = path.lastIndexOf('.') != -1 ? path.substring(path.lastIndexOf('.')+1) : '!';
                    if(!type) return error('404', 'The requested resource does not exist.', request, response);
                    console.log('REQ:', uri, path, type);
                    if(ob.options.types.indexOf(type.toLowerCase()) !== -1){
                        fs.exists(process.cwd()+path, function(exists){
                            if(exists){
                                fs.readFile(process.cwd()+path, function (err, buffer){
                                    if(err){
                                        module.exports.error(err.message, request, response);
                                        return error('404', 'The requested resource does not exist.', response);
                                    }
                                    var type = mime.lookup(path);
                                    response.setHeader("Content-Type", type);
                                    response.end(buffer.toString());
                                });
                            }else{
                                module.exports.error('DNE:'+path, request, response);
                                return error('404', 'The requested resource does not exist.', request, response);
                            }
                        });
                    }else if(fallthrough) fallthrough(request, response)
                }
            //case '':
            default: throw new Error('unknown type:'+type);
        }
    })
    this.log = Logger.log;
}
Server.prototype.listen = function(port, secure){
    var ob = this;
    var runService = function(){
        try{
            var server;
            var handler = ob.options.handlers['http'];
            var shandler = ob.options.handlers['https'];
            if(!secure){
                server = require('http').createServer(handler).listen(port);
                ob.emit('http-server-started', server);
                server.on("listening", function(){
                    ob.emit('http-server-listening', server);
                    ob.log('Listening on port '+port)
                });
            }else{
                if( shandler && (config.ssl_pfx || config.ssl_key && config.ssl_certificate) ){
                    ob.emit('https-server-started', server);
                    server = require('https').createServer(shandler).listen(port);
                }else throw new Error('wanted a secure server, but missing credentials (pfx, key & ssl cert)')
            }
            if(ob.options.handlers['http-websocket'] && server){
                ob.emit('socket-server-started', server);
                var io = require('socket.io').listen(server, { log: false });
                io.sockets.on('connection', function(socket){
                    if(a.socketHandler) a.socketHandler.apply(this, arguments);
                });
            }
            server.on('clientError', function(err, socket){
              socket.end('HTTP/1.1 400 Bad Request\r\n\r\n', err);
            });
            ob.stop = function(){
                server.close();
            }
        }catch(ex){
            console.log(ex)
            ob.error('Could not start webservice');
        }
    };
    if(this.options.domain === false){
        runService();
    }else{
        serverDomain.run(runService);
    }
}
Server.prototype.error = function(type, message, request, response){
    var options = {};
    var stack = (new Error()).stack.split("\n");
    stack.shift();
    options.stack = stack;
    if(typeof type === 'number') options.code = type;
    else{
        if(type && [
            '100', '101', '102', 
            '200', '201', '202', '203', '204', '205', '206', '207', '208',
            '300', '301', '302', '303', '304', '305', '306', '307', '308', 
            '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410',
                '411', '412', '413', '414', '415', '416', '417', '418', '419', '420', '422',
                '423', '424', '425', '426', '428', '429', '431', '440', '444', '449', '450', 
                '451', '494', '495', '496', '497', '499',
            '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '510', 
                '511', '520', '521', '522', '523', '524', '598', '599'
        ].indexOf(type) !== -1) options.code = parseInt(type);
        else options.code = 404;
    }
    options.message = message;
    //todo: handle other types of transports
    this.writePage(this.options, request, response, message, options);
    //if(this.options.errorFunction) this.options.errorFunction(options, request, response);
}

Server.prototype.act = function(action) {
    var ob = this;
    var requestDomain = domain.create();
    requestDomain.add(request);
    requestDomain.add(response);
    requestDomain.on('error', function(err){
        try{
            ob.error(err.code || 500, err.message, request, response);
        }catch(err){
            console.error('Error generating error '+err.message);
        }
    });
    if(this.options.domain === false){
        action();
    }else{
        serverDomain.run(action);
    }
};

Server.prototype.stop = function(){
};


Server.prototype.handleRequest = function(protocol, request, response, complete) {
    var ob = this;
    try{
        request.get = qs.parse(request.url);
        request.setEncoding("utf8");
        request.content = '';
        var random = 1 + Math.floor(Math.random()*1000000);
        request.addListener("data", function(chunk) {
            request.content += chunk;
        });
        request.addListener("end", function(){
            try{
                request.post = qs.parse(request.content); //first try normal args
            }catch(ex){
                try{
                    request.post = JSON.stringify(request.content); //if not give JSON a chance
                }catch(ex){}
            }
            if(complete) complete();
        });
        request.parsedURL = url.parse(request.url, true);
        request.get = request.parsedURL.query;
    }catch(ex){
        console.log(ex);
        return error('error', 'The requested resource does not exist.', request, response);
    }
};

Server.prototype.writePage = function(config, request, response, text, options, filter){
    if(typeof text == 'function'){
        filter = text;
        text = undefined;
    }
    var renderPage = function(text, cb){
        text = text.replace('{{language}}', config.language);
        text = text.replace('{{region}}', config.region);
        var scripts = '';
        if(config.scripts){
            scripts = config.scripts.map(function(script){
                return '<script src="'+script+'"></script>';
            }).join("\n");
        }
        if(options) Object.keys(options).forEach(function(optionName){
            text = text.replace('{{'+optionName+'}}', options[optionName]);
        });
        //todo: config.meta
        cb(text);
    }
    if(!response){
        console.log('Bad Request', request.method, request.url);
        return;
    }
    response.writeHead(options.code);
    fs.readFile(process.cwd()+'/client.js', function (err, init) {
        fs.exists(process.cwd()+'/raw.page.html', function(exists){
            if(exists){
                fs.readFile(process.cwd()+'/raw.page.html', function(err, file){
                    renderPage(file, function(page){
                        if(filter) body = filter(body);
                        response.end(body);
                    });
                });
            }else{
                renderPage(defaultPage, function(body){
                    if(filter) body = filter(body);
                    response.end(body);
                });
            }
        });
    });
}
var serverDomain = domain.create(); //create a domain context for the server
module.exports = Server;