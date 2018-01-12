var qs = require('querystring');
var url = require('url');

var GetVars = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
}

GetVars.prototype.handle = function(stream, request, response, callback){
    var resource = url.parse(request.url);
    request.paramstring = (resource.search || '').substring(1);
    request.get = qs.parse(request.paramstring);
    setTimeout(function(){
        callback();
    }, 0);
}

GetVars.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}
module.exports = GetVars;
