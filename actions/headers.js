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

var HTTPFile = function(options){
    this.name = 'http-file';
    this.options = options || {};
    this.types = this.options.types || [
        'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
        'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
    ];
    this.baseName = this.options.baseName || process.cwd();
}

HTTPFile.prototype.handle = function(req, res){
    var uri = url.parse(request.url, true);
    var path = ((type == '!' && uri.pathname != '/')?uri.pathname+'.html':uri.pathname);
    var type = path.lastIndexOf('.') != -1 ? path.substring(path.lastIndexOf('.')+1) : '!';
    var file = this.baseName + '/' + path;
    if(!type) return ob.error('404', 'The requested resource does not exist.', request, response);
    fs.exists(file, function(exists){
        if(exists){
            var stream = fs.createReadStream(file);
            stream.pipe(oppressor(req)).pipe(res);
        }else{
            else this.error(new Error('File does not exist'));
        }
    });
}

HTTPFile.prototype.processGetParams = function(req, res, cb){

}

HTTPFile.prototype.processGetParams = function(cb){

}

HTTPFile.prototype.error = function(err){
    console.log('ERROR: '+err.message);
    this.log()
}
/*HTTPFile.prototype.log = function(level, message){
    if(level && !message){
        message = level;
        level = 'OMG'
    }
    console.log(message);
}*/
module.exports = HTTPFile;
