//let textTpl = require('../data/Text');
let fs = require('fs');
let path = require('path');



let utils = module.exports;

// control variable of func "myPrint"
let isPrintFlag = false;
// var isPrintFlag = true;

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function (cb) {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * clone an object
 */
utils.clone = function (origin) {
    if (!origin) {
        return;
    }

    var obj = {};
    for (var f in origin) {
        if (origin.hasOwnProperty(f)) {
            obj[f] = origin[f];
        }
    }
    return obj;
};

//返回传递给他的任意对象的类
let isClass = function (o) {
    if (o === null) return "Null";
    if (o === undefined) return "Undefined";
    return Object.prototype.toString.call(o).slice(8, -1);
}
//深度克隆一个对象
utils.fullClone = function (obj) {
    var result, oClass = isClass(obj);

    //确定result的类型
    if (oClass === "Object") {
        result = {};
    } else if (oClass === "Array") {
        result = [];
    } else {
        return obj;
    }
    for (let key in obj) {
        var copy = obj[key];
        if (isClass(copy) == "Object") {
            result[key] = utils.fullClone(copy); //arguments.callee(copy);//递归调用
        } else if (isClass(copy) == "Array") {
            result[key] = utils.fullClone(copy); //arguments.callee(copy);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}


utils.size = function (obj) {
    if (!obj) {
        return 0;
    }

    var size = 0;
    for (var f in obj) {
        if (obj.hasOwnProperty(f)) {
            size++;
        }
    }

    return size;
};

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

utils.myPrint = function () {
    if (isPrintFlag) {
        var len = arguments.length;
        if (len <= 0) {
            return;
        }
        var stack = getStack();
        var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
        for (var i = 0; i < len; ++i) {
            aimStr += arguments[i] + ' ';
        }
        console.log('\n' + aimStr);
    }
};
// print the file name and the line number ~ end

// 获取对象类名
utils.getObjectClass = function (obj) {
    if (obj && obj.constructor && obj.constructor.toString()) {
        /*
         * for browsers which have name property in the constructor
         * of the object,such as chrome
         */
        if (obj.constructor.name) {
            return obj.constructor.name;
        }
        var str = obj.constructor.toString();
        /*
         * executed if the return of object.constructor.toString() is
         * "[object objectClass]"
         */
        if (str.charAt(0) == '[') {
            var arr = str.match(/\[\w+\s*(\w+)\]/);
        } else {
            /*
             * executed if the return of object.constructor.toString() is
             * "function objectClass () {}"
             * for IE Firefox
             */
            var arr = str.match(/function\s*(\w+)/);
        }
        if (arr && arr.length == 2) {
            return arr[1];
        }
    }
    return undefined;
};

String.prototype.format = function (args) {
    var result = this;
    if (arguments.length > 0) {
        if (arguments.length == 1 && typeof (args) == "object") {
            for (var key in args) {
                if (args[key] != undefined) {
                    var reg = new RegExp("({" + key + "})", "g");
                    result = result.replace(reg, args[key]);
                }
            }
        }
        else {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] != undefined) {
                    var reg = new RegExp("({)" + i + "(})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
    }
    return result;
};
/*
// 获取Text表对应的数据
utils.text = function (tid, exDict) {
    if (exDict)
        return textTpl[tid].format(exDict);
    else
        return textTpl[tid];
};
*/
utils.isEmptyObject = function (obj) {
    for (let n in obj) {
        return false;
    }
    return true;
};

utils.sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

//ret: [{name:'damageBuff',file:'E:/.../damageBuff.js'},... ]
utils.getJsFiles = (dir) => {
    let ret = [];
    fs.readdirSync(dir).forEach(function (filename) {
        if (!/\.js$/.test(filename)) {
            return;
        }
        var name = path.basename(filename, '.js');
        ret.push({name: name, file: (dir + "/" + filename)});
    });
    //logger.debug(dir," files:",ret);
    return ret;
};

//For [min, max)
utils.randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
};
//note：会改变输入参数arr
utils.arrayRandom = (arr, count) => {
    let ret = [];
    if (count > arr.length) count = arr.length;
    for (let cnt = 0; cnt < count; cnt++) {
        let r = utils.randomInt(0, arr.length);
        ret.push(arr[r]);
        arr.splice(r, 1);
    }
    return ret;
};

//合并scr的属性到des
utils.combineObj = (des, src) => {
    for (let k in src) {
        des[k] = src[k];
    }
};


