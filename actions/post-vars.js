var qs = require('querystring');
var url = require('url');

var PostVars = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
}

var parseContent = function(request){
    try{
        request.post = JSON.parse(request.content); //if not give JSON a chance
    }catch(ex){
        try{
            request.post = qs.parse(request.content); //first try normal args
        }catch(ex){}
    }
}

PostVars.prototype.handle = function(stream, request, response, callback){
    //console.log(request);
    if(request.contentLoaded){
        parseContent(request);
        if(callback) callback();
    }else{
        req.on("end", function(){
            parseContent(request);
            if(callback) callback();
        });
    }
}

PostVars.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}
module.exports = PostVars;
