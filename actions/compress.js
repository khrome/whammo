var oppressor = require('oppressor');

var Compress = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
}

Compress.prototype.handle = function(stream, req, res, cb){
    setTimeout(function(){
        stream.pipe(oppressor(req))
        cb(stream);
    }, 0);
}

Compress.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}
module.exports = Compress;
