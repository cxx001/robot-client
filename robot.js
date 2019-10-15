/**
 * cmd: node robot.js invateCode robotNum
 */

let logger2 = require('./util/logger').getLogger('mark');       
let sleep = require('./util/utils').sleep ; 
let Client = require('./views/client');

process.on('uncaughtException',
	async function (err) {
		logger2.fatal("uncaughtException:", err);
		await sleep(1000);
		process.exit(0);
	}
);

process.on('unhandledRejection',
	async function (err) {
		logger2.fatal("unhandledRejection:", err);
		await sleep(1000);
		process.exit(0);
	}
);

let arguments = process.argv.splice(2);
if (arguments.length < 1) {
    logger2.error('argumemnt error.');
	process.exit(1);
}

let invateCode =  arguments[0];
let robotNum = arguments[1] || 10;
let run = async function(){
    let clients = [];
    for(let i = 1; i <= robotNum; i++ ){
		let openid = 'robot_' + invateCode + '_' + i;
		let client = new Client(openid, invateCode, i);
		clients.push(client);
	}
}
run();