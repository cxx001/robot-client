
let logger2 = require('./util/logger').getLogger('mark');       
let sleep = require('./util/utils').sleep ; 
let Client = require('./views/client');

let RobotNum = 10;

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


let run = async function(){
    let clients = [];
    for(let cnt = 0; cnt<RobotNum; cnt ++ ){
        let name = 'robot_' + cnt;
        clients[cnt] = new Client(name, '', 0);
	}
	
	for(let cnt = RobotNum; cnt<RobotNum*2; cnt ++ ){
        let name = 'robot_' + cnt;
        clients[cnt] = new Client(name, '', 1);
	}
	
	for(let cnt = RobotNum*2; cnt<RobotNum*3; cnt ++ ){
        let name = 'robot_' + cnt;
        clients[cnt] = new Client(name, '', 2);
    }
	
	// let client = new Client('test_1', '', 0);
}

run();
