/**
 * cmd: node robot.js robotNum
 */

let logger2 = require('./util/logger').getLogger('mark');       
let Client = require('./views/client');

process.on('uncaughtException',
	async function (err) {
		logger2.fatal("uncaughtException:", err);
		logger2.fatal(err.stack);
	}
);

process.on('unhandledRejection',
	async function (err) {
		logger2.fatal("unhandledRejection:", err);
		logger2.fatal(err.stack);
	}
);

let arguments = process.argv.splice(2);
if (arguments.length < 1) {
    logger2.error('argumemnt error.');
	process.exit(1);
}

let robotNum = arguments[0];
let run = async function(){
    let clients = [];
    for(let i = 1; i <= robotNum; i++ ){
		let openid = 'robot_' + i;
		let client = new Client(openid, i);
		clients.push(client);
	}
}
run();


// new Client('robot_2', 75135820, 2);