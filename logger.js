var Logger = {
    log : function(message, level){
        //todo: convert to a 2 way map
        if(typeof level == 'string'){
            switch(level.toLowerCase()){
                case 'error':
                    level = Logger.ERROR;
                    break;
                case 'debug':
                    level = Logger.DEBUG;
                    break;
                case 'fatal':
                    level = Logger.FATAL;
                    break;
                case 'information':
                    level = Logger.INFORMATION;
                    break;
                case 'warning':
                    level = Logger.WARNING;
                    break;
            }
        }
        if(typeof message == 'function'){
            logger = message;
        }else{
            if(!level) level = Logger.INFO;
            if(module.exports.log_level & level){
                logger(message);
            }
        }
    }
}

var aBit = 1;
Logger.FATAL = aBit;
Logger.ERROR = aBit << 1;
Logger.WARNING = aBit << 2;
Logger.WARN = Logger.WARNING;
Logger.INFORMATION = aBit << 3;
Logger.INFO = Logger.INFORMATION;
Logger.DEBUG = aBit << 4;
Logger.TRACE = aBit << 5;


module.exports = Logger;