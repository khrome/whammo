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

var proxyFns = [
    'writeHead', 'writeContinue', 'setHeader', 'write', 'end', 'addTrailers'
];

function proxy(ob, name){
    ob[name] = function(){
        ob.stack.push({
            functionName: name,
            args: arguments
        });
    }
}

function BuffereredHTTPResponse(headWriter){
    //todo: we *could* reorder post-write headers
    var ob = throughBuffer();

    var headers = {};
    var headersSent;
    ob.setHeader = function(name, value){
        if(headersSent) throw new Error('ERR_HTTP_HEADERS_SENT');
        headers[name] = value
    }
    var originalWrite = ob.write;
    var write = function(line){
        originalWrite.apply(ob, [line]);
    }
    ob.write = function(name, value){
        if(!headersSent) ob.writeHead();
        originalWrite.apply(ob, arguments);
    }
    ob.writeContinue = function(name, value){
        write()

    }
    ob.writeHead = function(code, newHeaders){
        Object.keys(newHeaders).forEach(function(header){
            headers[header] = newHeaders[header];
        });
        var message = statusCodes[code];
        write(`HTTP/1.1 ${code} ${message}${CRLF}`);
        this.statusMessage = code
    }
}
//todo: stream compatibility
/*function BuffereredHTTPResponse(){
    var ob = function(){};
    ob.stack = [];
    proxyFns.forEach(function(fnName){
        proxy(ob, fnName);
    });
    ob.pipe = function(res){
        if(!res instanceof http.Response) throw new Error('Not an HTTP response!');
        var actions = ob.stack;
        ob.stack = [];
        actions.forEach(function(action){
            res[action.functionName].apply(res, action.args);
        });
    }
    ob.hasHeader = function(name){
        var results = ob.stack.filter(function(item){
            return item.name === 'setHeader' && item.args[0] === name;
        });
        return results.length > 0;
    };
    ob.getHeaderNames = function(){
        return ob.stack.filter(function(item){
            return item.name === 'setHeader';
        }).map(function(item){
            return item.args[0];
        });
    };
    ob.getHeaders = function(){
        var res = {};
        ob.stack.filter(function(item){
            return item.name === 'setHeader';
        }).forEach(function(item){
            return res[item.args[0]] = item.args[1];
        });
        return res;
    };
    return ob;
}

throughBuffer.Response = BuffereredHTTPResponse;*/

var statusCodes = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',               // RFC 4918
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',         // RFC 7238
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: 'I\'m a teapot',              // RFC 2324
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',       // RFC 4918
  423: 'Locked',                     // RFC 4918
  424: 'Failed Dependency',          // RFC 4918
  425: 'Unordered Collection',       // RFC 4918
  426: 'Upgrade Required',           // RFC 2817
  428: 'Precondition Required',      // RFC 6585
  429: 'Too Many Requests',          // RFC 6585
  431: 'Request Header Fields Too Large', // RFC 6585
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',    // RFC 2295
  507: 'Insufficient Storage',       // RFC 4918
  508: 'Loop Detected',
  509: 'Bandwidth Limit Exceeded',
  510: 'Not Extended',               // RFC 2774
  511: 'Network Authentication Required' // RFC 6585
};


module.exports = throughBuffer;
