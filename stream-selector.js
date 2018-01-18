var BufferedOutputStream = require('./buffered-output-stream');

//generalizing the switch logic
function StreamSelector(output){
    var bufferedInputStream = req.pipe(through());
    //pause the buffer, while we setup streams for each service
    bufferedInputStream.pause();
    bufferedInputStream.setMaxListeners(20);
    this.input = bufferedInputStream;
    this.index = {};
    this.ordering = []; //todo
    new Emitter.onto(this);
}

StreamSelector.prototype.newPotentialOutput = function(cb){
    var name = uuid.v4();
    var ob = this;
    this.index[name] = false;

    var outputBuffer = new BufferedOutputStream();
    outputBuffer.halt();
    outputBuffer.setMaxListeners(20);

    var stream = duplexer(
        //fork paused stream
        outputBuffer,
        //fork stream so pause control is independent
        bufferedInputStream.pipe(through())
    );

    var fn = function(err, stream){
        if(ob.index[name]) throw new Error('double called output function')
        ob.index[name] = stream || true;
        var left = Object.keys(this.index).filter(function(key){
            return !ob.index[key];
        }).length;
        if(left === 0){
            var streams = Object.keys(this.index).filter(function(key){
                return ob.index[key] && ob.index[key] !== true;
            }).map(function(key){
                return ob.index[key]
            })
            ob.emit('output-streams', streams);
            ob.emit('top-stream', streams[0]);
        }
    }
    cb(undefined, stream, fn);
}

StreamSelector.prototype.destroy = function(){

}

module.exports = StreamSelector;
