/**
 * cmd: node robot.js clubId inviteCode robotNum
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
		//await sleep(1000);
		//process.exit(0);
	}
);

let arguments = process.argv.splice(2);
if (arguments.length < 2) {
    logger2.error('argumemnt error.');
	process.exit(1);
}

let clubId = arguments[0];
let inviteCode =  arguments[1];
let robotNum = arguments[2] || 10;
let run = async function(){
    let clients = [];
    for(let i = 1; i <= robotNum; i++ ){
        let openid = 'robot_' + clubId + '_' + i;
		let client = new Client(openid, clubId, inviteCode, i);
		clients.push(client);
	}
}
run();