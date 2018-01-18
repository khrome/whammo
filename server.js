#!/usr/bin/env node

//unassuming streaming server wrapper
var arrays = require('async-arrays');
var fs = require('fs');
var vm = require('vm');
var qs = require('querystring');
var url = require('url');
var mime = require('mime');
var domain = require('domain');
var uuid = require('uuid');
var Emitter = require('extended-emitter');
var stream = require('stream');
var util = require('util');
var through = require('through');
var duplexer = require('duplexer');

/******************[Do It Like This]

    var server = new MicroServer({
        actions : [
            //first look for any static files
            { name : 'http-file', types:[
                'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
                'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
            ], then : { name : 'compress' }},
            // always load GET vars
            { name : 'get-vars' },
            // always load POST vars
            { name : 'post-vars' },
            { name : 'director-router', with : {
                routes : {
                    '/': {get : function(){
                        this.res.write('fldskklfdsgfds');
                        this.res.end('TESTING');
                    }}
                }
            }},
            { name : '404' , then : { name : 'compress' }}
        ]
    });
    server.listen(80);


 ****************************************/

var Logger = require('./logger');
//Logger.logLevel = Logger.INFO;
var ApplicationError = require('./error');
var BufferedOutputStream = require('./buffered-output-stream');

var actionClasses = {};

function makeAction(name, options){
    if(name && (!options) && typeof name !== 'string'){
        options = name;
        name = options.name;
    }
    if(!actionClasses[name]) actionClasses[name] = require('./actions/'+name);
    var action = new actionClasses[name](options.with || {});
    action.name = name;
    if(options.where) action.where = options.where;
    if(options.then){
        action.then = options.then;
        var subaction;
        action.continue = function(stream, req, res, cb){
            if(!subaction) subaction = makeAction(options.then);
            subaction.act(stream, req, res, function(truthyOutputStream){
                if(cb) cb(truthyOutputStream)
            });
        }
    }else{
        action.continue = function(stream, req, res, cb){ if(cb) cb() };
    }
    action.act = function(stream, req, res, cb){
        action.handle(stream, req, res, function(truthyStream, isRaw){
            action.continue(stream, req, res, function(truthyChildStream){
                if(truthyStream && truthyChildStream){
                    this.log('DOWNSTREAM-PRODUCT['+req.id+']: '+action.name);
                    cb(truthyChildStream);
                }else{
                    if(truthyStream) Logger.log('STREAM-PRODUCT['+req.id+']: '+action.name);
                    else Logger.log('EMPTY-STREAM['+req.id+']: '+action.name);
                    cb(truthyStream, isRaw);
                }
            });
        });
    }
    return action;
}

var Server = function(options){
    this.options = options || {};
    (new Emitter()).onto(this);
    if(!this.options.types){
        this.options.types = [
            'png', 'gif', 'jpg', 'jpeg', 'json', 'js', 'html', 'css',
            'ttf', 'eot', 'woff', 'ico', 'otf', 'svg', 'handlebars'
        ];
    }
    if(!this.options.handlers) this.options.handlers = {};
    var ob = this;
    this.actions = [];
    if(this.options.actions) this.options.actions.forEach(function(action){
        if(typeof action === 'string') action = {name : action};
        ob.action(action.name, action);
    });
    this.log = Logger.log;
}

Server.maxPostLength = 1000000; //1MB

Server.prototype.listen = function(port){
    var ob = this;
    var serverDomain = domain.create();
    var serverInstance;
    var actions = this.actions;
    var isUsingDomains = (ob.options.domain === false);
    serverDomain.add(actions);
    var runService = function(){
        Logger.log('SERVER LAUNCHED');
        try{
          var AppError = require('./error.js');
          var server = require('http').createServer(function(req, res){
              var arrays = require('async-arrays');
              var sift = require('sift');
              var through = require('through');
              var duplexer = require('duplexer');
              var BufferedOutputStream = require('./buffered-output-stream');
              var id = uuid.v4();
              req.id = id;
              Logger.log('REQUEST['+req.id+']:'+req.url);
              var serve = function(){
                  //hold a reasonable request body
                  req.setEncoding("utf8");
                  req.content = new Buffer('');
                  req.on("data", function(chunk){
                      var maxSize = req.maxPostLength || Server.maxPostLength;
                      if(req.content.length < maxSize){
                          req.content.write(chunk);
                      }else throw new Error(
                          'uploaded POST body exceeds allowable length'
                      );
                  });
                  req.setMaxListeners(20);
                  res.setMaxListeners(20);
                  req.on("end", function(chunk){
                      if(chunk) req.content.write(chunk);
                      req.content = req.content.toString();
                      req.contentLoaded = true;
                  });

                  // buffer the request stream
                  var bufferedInputStream = req.pipe(through());
                  //pause the buffer, while we setup streams for each service
                  bufferedInputStream.pause();
                  bufferedInputStream.setMaxListeners(20);
                  var output;
                  var outputStream;
                  var outputPos;
                  var outputAction;
                  var outputRaw;
                  arrays.forEachEmission(actions, function(action, index, done){
                      var outputBuffer = new BufferedOutputStream();
                      outputBuffer.halt();
                      outputBuffer.setMaxListeners(20);
                      // duplex copy of input stream to paused output buffer
                      var stream = duplexer(
                          //fork paused stream
                          outputBuffer,
                          //fork stream
                          bufferedInputStream.pipe(through())
                      );
                      var doAction = function(){
                          action.act(stream, req, res, function(producedOutput, isRaw){
                              if( producedOutput &&
                                  ((!outputStream) || outputPos > index)
                              ){
                                  outputStream = producedOutput;
                                  outputPos = index;
                                  outputRaw = !!isRaw;
                                  output = outputBuffer;
                                  outputAction = action;
                              }
                              done();
                          });
                      }
                      if(actions.where){
                          var testAction = sift(actions.where);
                          if(testAction({req:req, res:res})){
                              doAction();
                          }//else don't
                      }else doAction(); //no conditions
                  }, function(){
                      ob.emit('response', {
                          action : outputAction.name,
                          options : outputAction.options
                      });
                      Logger.log('RESPONSE['+outputAction.name+']');
                      //pipe the winning output to res
                      if(outputRaw) output.pipeRaw(res);
                      else output.pipe(res);
                      output.flush();
                  });
                  //now that the pipeline's all set up, turn on the tap
                  bufferedInputStream.resume();
              }
              if(!isUsingDomains){
                  setTimeout(function(){
                      serve();
                  }, 0);
              }else{
                  var requestDomain = domain.create();
                  requestDomain.add(req);
                  requestDomain.add(res);
                  requestDomain.add(actions);
                  requestDomain.add(sift);
                  requestDomain.on('error', function(err){
                      console.log('REQUEST ERROR', err.stack);
                      new AppError(err).respond(req, res);
                  });
                  requestDomain.run(serve);
              }
          });
          server.on('clientError', function(err, socket){
              console.log('ERROR', err.stack);
              new AppError(err).respond({}, socket);
          });
          server.listen(port || 80);
          serverInstance = server;
        }catch(ex){
            console.log(ex)
            ob.error('Could not start webservice');
        }
    };
    ob.close = function(cb){
        return serverInstance && serverInstance.close(cb);
    }
    if(!isUsingDomains){
        setTimeout(function(){
            runService();
        }, 0);

    }else{
        serverDomain.on('error', function(err){
            console.log('REQUEST ERROR', err.stack);
            var error = new ApplicationError(err).respond(req, res);
        });
        serverDomain.run(runService);
    }
}

Server.prototype.run = function(logic, emitters){
    var isUsingDomains = (ob.options.domain === false);
    if(isUsingDomains){
        var domain = domain.create();
        if(emitters) emitters.forEach(function(emitter){
            domain.add(emitter);
        });
        domain.run(serve);
    }else{
        setTimeout(function(){
            logic.apply(context);
        },0);
    }
}

//PROTOTYPE CLEANUP
/*
Server.prototype.listen = function(port){
    var ob = this;
    var run = ob.run;
    var serverInstance;
    run(function(){
        Logger.log('SERVER LAUNCHED');
        try{
          var AppError = require('./error.js');
          var server = require('http').createServer(function(req, res){
              var arrays = require('async-arrays');
              var sift = require('sift');
              var through = require('through');
              var duplexer = require('duplexer');
              var StreamSelector = require('./stream-selector');
              var id = uuid.v4();
              req.id = id;
              Logger.log('REQUEST['+req.id+']:'+req.url);
              run(function(){
                  //hold a reasonable request body
                  req.setEncoding("utf8");
                  req.content = new Buffer('');
                  req.on("data", function(chunk){
                      var maxSize = req.maxPostLength || Server.maxPostLength;
                      if(req.content.length < maxSize){
                          req.content.write(chunk);
                      }else throw new Error(
                          'uploaded POST body exceeds allowable length'
                      );
                  });
                  req.setMaxListeners(20);
                  res.setMaxListeners(20);
                  req.on("end", function(chunk){
                      if(chunk) req.content.write(chunk);
                      req.content = req.content.toString();
                      req.contentLoaded = true;
                  });

                  var selector = new StreamSelector(req);
                  selector.once('top-stream', function(stream){
                      ob.emit('response', {
                          action : outputAction.name,
                          options : outputAction.options
                      });
                      Logger.log('RESPONSE['+outputAction.name+']');
                      //pipe the winning output to res
                      if(stream.isRaw) output.pipeRaw(res);
                      else output.pipe(res);
                      output.flush();
                  });
                  arrays.forEachEmission(actions, function(action, index, done){
                      selector.newPotentialOutput(function(err, stream, complete){
                          var doAction = function(){
                              action.act(stream, req, res, function(producedOutput, isRaw){
                                  if(producedOutput){
                                      producedOutput.action = action;
                                      producedOutput.isRaw = !!isRaw;
                                  }
                                  complete(producedOutput);
                                  done();
                              });
                          }
                          if(action.where){
                              var testAction = sift(action.where);
                              if(testAction({req:req, res:res})){
                                  doAction();
                              }//else don't
                          }else doAction(); //no conditions
                      });
                  }, function(){ });
                  //now that the pipeline's all set up, turn on the tap
                  bufferedInputStream.resume();
              }, [req, res]);
          });
          server.on('clientError', function(err, socket){
              console.log('ERROR', err.stack);
              new AppError(err).respond({}, socket);
          });
          server.listen(port || 80);
          serverInstance = server;
        }catch(ex){
            console.log(ex)
            ob.error('Could not start webservice');
        }
    });
    ob.close = function(cb){
        return serverInstance && serverInstance.close(cb);
    }
}*/

Server.prototype.action = function(name, options){
    try{
        var action = makeAction(name, options);
        this.actions.push(action);
    }catch(ex){ }
    return this;
};

Server.prototype.close = function(cb){
    cb && cb();
};
var serverDomain = domain.create(); //create a domain context for the server

Server.Error = ApplicationError;
module.exports = Server;
