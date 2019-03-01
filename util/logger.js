'use strict';
var log4js = require('log4js');
var logDir = 'logs'+100 ;

log4js.configure({
    appenders: {
        rule_console: {
            type: "console"
        },
        rule_file: {
            type: "dateFile",
            filename: __dirname + '/../'+logDir+'/debug/log-',
            encoding: "utf-8",
            //maxLogSize: 1000000,
            //numBackups: 3,
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true
        },
        rule_mark: {
            type: "dateFile",
            filename: __dirname + '/../'+logDir+'/debug/a_mark-',
            encoding: "utf-8",
            //maxLogSize: 1000000,
            //numBackups: 3,
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true
        }
    },
    categories: {
        default: {
            appenders: [
                "rule_console",
                "rule_file"
            ],
            level: "debug"
        },
        mark: {
            appenders: [
                "rule_console",
                "rule_file",
                "rule_mark"
            ],
            level: "debug"
        }
    }
});

module.exports = log4js;