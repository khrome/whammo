var fs = require('fs');
var oppressor = require('oppressor');
var mime = require('mime');
var url = require('url');

var HTTPFile = function(options){
    this.name = __filename.split('/').pop();
    this.options = options || {};
    this.types = this.options.types || [
        'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
        'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
    ];
    this.baseName = this.options.baseName || process.cwd();
}

HTTPFile.prototype.handle = function(stream, req, res, cb){
    var uri = url.parse(req.url, true);
    var path = ((type == '!' && uri.pathname != '/')?uri.pathname+'.html':uri.pathname);
    var type = path.lastIndexOf('.') != -1 ? path.substring(path.lastIndexOf('.')+1) : '';
    var file = this.baseName + path;
    if(!type){
        setTimeout(function(){ cb() }, 0);
        return;
    }
    if(type && this.types.indexOf(type) === -1){
        //not a servable type
        setTimeout(function(){ cb() }, 0);
        return;
    }
    fs.exists(file, function(exists){
        if(exists){
            var type = mime.lookup(file);
            res.setHeader("Content-Type", type);
            var fileStream = fs.createReadStream(file);
            var result = fileStream.pipe(stream);
            //done
            setTimeout(function(){ cb(result) }, 0);
        }else setTimeout(function(){ cb() }, 0);
    });
}

HTTPFile.prototype.error = function(err){
    console.log('ERROR: '+err.message);
    //this.log()
}
module.exports = HTTPFile;
