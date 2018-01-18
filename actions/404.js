var FileNotFound = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
}

FileNotFound.prototype.handle = function(stream, req, res, cb){
    //todo: support 404 file
    if(!this.options.json){
        //res.statusCode = 404;
        //res.writeHead(404);
        stream.write(
            '<html><head>'+
            '<title>404 - File Not Found</title>'+
            '</head><body>'+
            '<h1>404 Error</h1>'+
            '<h3>File Not Found</h3>'+
            '</body></html>'
        );
        stream.end();
    }else{
        //res.statusCode = 200;
        stream.end(JSON.stringify({
            error : 404,
            message : 'File Not Found'
        }, undefined, '    '));
    }
    setTimeout(function(){
        cb(stream); // always outputs
    }, 0);
}

FileNotFound.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}
module.exports = FileNotFound;
