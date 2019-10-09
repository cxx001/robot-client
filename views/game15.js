let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let sleep = require('../util/utils').sleep; 
let Game15Logic = require('./game15Logic');

class Game15{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.userData = client.userData;

		// 监听服务端推送消息
		this.pomelo.on('onStartGame',this._onStartGame.bind(this));
	}

    async mainLoop(){
		// 进入房间
		let msg = {
			gameType: this.gameType,
			stage: this.stage
		}
		await this.pomelo.request('connector.matchHandler.enterGoldRoom', msg).then((data)=>{

		})
	}
	
	_onStartGame(data){
	}
};

module.exports = Game15;