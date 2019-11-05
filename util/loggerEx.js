
let logger = require('./logger').getLogger();

// print the file name and the line number ~ begin
function getStack() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    var err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
}

function getFileName(stack) {
    return stack[1].getFileName();
}

function getLineNumber(stack) {
    return stack[1].getLineNumber();
}

class loggerEx{
    constructor(){
	}

	init(opts) {
		let name = opts.name || '未知名字';
		this.prefix = "[" + name + "] ";
	};

	log() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.log.apply(logger, arguments);
	};

	debug() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.debug.apply(logger, arguments);
	};

	info() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.info.apply(logger, arguments);
	};

	warn() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.warn.apply(logger, arguments);
	};

	error() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.error.apply(logger, arguments);
	};

	trace() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.trace.apply(logger, arguments);
	};

	fatal() {
		let stack = getStack();
		let aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
		arguments[0] = aimStr + this.prefix + arguments[0];
		logger.fatal.apply(logger, arguments);
	};
}

module.exports = loggerEx;
