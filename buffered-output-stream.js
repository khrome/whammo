var through = require('through');
var Response = require('http').ServerResponse;

function throughBuffer(){
    var queue = [];
    var outputBuffer = through(function(data){
        if(this.flushed) this.emit('data', data);
        else queue.push(data);
    }, function(){
        if(this.flushed) this.emit('end');
        else queue.push(null);
    });
    outputBuffer.halt = function(){
        this.flushed = false;
    }

    outputBuffer.pipeRaw = function(stream){
        var fnName = stream['_writeRaw']?'_writeRaw':'write';
        outputBuffer.on('data', function(item){
            stream[fnName](item);
        });
    }

    outputBuffer.flush = function(){
        var data = queue;
        queue = [];
        var ob = this;
        data.forEach(function(item){
            if(item) ob.emit('data', item);
            else ob.emit('end');
        });
        this.flushed = true;
    }
    return outputBuffer;
}

module.exports = throughBuffer;
