var fs = require('fs');
//var url = require('url');
var Emitter = require('extended-emitter');
var Response = require('http').ServerResponse;

var Packer = function(options){
    //todo: make me a service to reduce impact to the web app
    this.name = __filename.split('/').pop();
    this.options = options || {};
    new Emitter().onto(this);
    var ob = this;
}

var appRoot = process.cwd();

Packer.prototype.handle = function(stream, req, res, cb){
    var ob = this;
    //parse-url
    var parts = req.url.substring(1).split("/");
    var sentinel = parts.shift();
    var file = parts.join("/");
    var scratch = this.options.workingDirectory || './bin';
    console.log(req.url, sentinel);
    //fetch
    if(sentinel== '__bundle_js'){
        console.log('bundle!');
        var lastDot = file.lastIndexOf('.');
        var bundleName = file.substring(0, lastDot)+'.bundle'+file.substring(lastDot);
        var externs = ob.options.externals;
        fs.exists(file, function(exists){
            console.log('exists!');
            if(exists){
                ob.setup({
                     entry: './'+file,
                     output: {
                         path: scratch,
                         filename: bundleName
                     },
                     externals: externs
                }, function(err, results){
                     if(err) cb({error:err, detail:results.toJson("verbose")});
                     if(!err){
                         console.log('PACKED', arguments);
                         //fs.readFile(file, function(fileErr, body){
                             var file = scratch+'/'+bundleName;
                             //todo: hold body in mem and only reload after stat()
                             fs.readFile(file, function(fileErr, depsBody){
                                 res.setHeader(
                                     'Content-Type',
                                     'text/javascript;charset=UTF-8'
                                 );
                                 res.setHeader('Server', 'embedded:whammo/pack-js + webpack');
                                 stream.write(depsBody);
                                 cb();
                             });
                         //});
                     }
                });
            }else{
                stream.write('Not a valid resource');
                cb();
            }
        });
    }else return cb();
}

Packer.prototype.setup = function(options, cb){
    var compiler = webpack(options);
    if(this.options.watch){ //a bad idea, unless you are in dev
        compiler.watch({
            aggregateTimeout: 300, // wait so long for more changes
            poll: true // use polling instead of native watchers
            // pass a number to set the polling interval
        }, cb);
    }else{
        compiler.run(cb);
    }
}

Packer.prototype.error = function(err){
    console.log('ERROR: '+err.message);
}

module.exports = Packer;
