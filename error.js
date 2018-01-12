var Emitter = require('extended-emitter');
var clone = require('extend');

var defaultPage = '<html>'+
    '<head>'+
        '<title>{{title}}</title>'+
    '</head>'+
    '<body>'+
        '<h2>{{code}} Error</h2>'+
        '<p>{{message}}</p>'+
    '</body>'+
'</html>';

var renderPage = function(text, values, cb){
    text = text.replace('{{language}}', values.language);
    text = text.replace('{{region}}', values.region);
    var scripts = '';
    if(values.scripts){
        scripts = values.scripts.map(function(script){
            return '<script src="'+script+'"></script>';
        }).join("\n");
    }
    if(values.vars) Object.keys(values.vars).forEach(function(optionName){
        text = text.replace('{{'+optionName+'}}', values.vars[optionName]);
    });
    //todo: config.meta
    cb(text);
}

function ApplicationError(msg, type){
  Error.call(this);
  //older, capture by hand strategy
  //var stack = (new Error()).stack.split("\n");
  //stack.shift();
  //options.stack = stack;
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  if(typeof type === 'number') this.code = type;
  else{
      if(type && [
          '100', '101', '102',
          '200', '201', '202', '203', '204', '205', '206', '207', '208',
          '300', '301', '302', '303', '304', '305', '306', '307', '308',
          '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410',
              '411', '412', '413', '414', '415', '416', '417', '418', '419', '420', '422',
              '423', '424', '425', '426', '428', '429', '431', '440', '444', '449', '450',
              '451', '494', '495', '496', '497', '499',
          '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '510',
              '511', '520', '521', '522', '523', '524', '598', '599'
      ].indexOf(type) !== -1) this.code = parseInt(type);
      else this.code = 500;
  }
  if(msg instanceof Error){
      this.stack = msg.stack;
      this.message = msg.message;
      if(msg.code) this.code = msg.code;
  }
  this.name = 'ApplicationError';
  var err = this;
  setTimeout(function(){
      ApplicationError.events.emit('error', err);
  }, 0);
};
ApplicationError.prototype.__proto__ = Error.prototype;

ApplicationError.JSON = false;

ApplicationError.prototype.respond = function(request, response){
    if(ApplicationError.JSON){
        response.writeHead(200);
        var message = {
            message : this.message,
            code : this.code
        }
        if(ApplicationError.JSON === 'pretty'){
            response.end(JSON.stringify(message, undefined, '    '));
        }else{
            response.end(JSON.stringify(message));
        }
    }else{
        response.writeHead(this.code);
        fs.readFile(process.cwd()+'/client.js', function (err, init) {
            var scripts = [(init||'/* No client.js found. */')];
            fs.exists(process.cwd()+'/raw.page.html', function(exists){
                if(exists){
                    fs.readFile(process.cwd()+'/raw.page.html', function(err, file){
                        renderPage(file, {scripts:scripts}, function(page){
                            response.end(body);
                        });
                    });
                }else{
                    renderPage(defaultPage, {scripts:scripts}, function(body){
                        response.end(body);
                    });
                }
            });
        });
    }
}

ApplicationError.events = new Emitter();

module.exports = ApplicationError;
