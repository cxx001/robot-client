let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let sleep = require('../util/utils').sleep; 
let Game15Logic = require('./game15Logic');

class Game15{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.userData = client.userData;
		this._initNetEvent();
	}

	_initNetEvent() {
		this.pomelo.on('onUserEntryRoom',this.onUserEntryRoom.bind(this));
		this.pomelo.on('onSendParameter',this.onSendParameter.bind(this));
		this.pomelo.on('onSendGameScene',this.onSendGameScene.bind(this));
	}

    async mainLoop(){
		logger.info('-----------进入牌桌-----------')
	}
	
	onUserEntryRoom(data){
		logger.info(data);
	}

	onSendParameter(data){
		logger.info(data);
	}

	onSendGameScene(data){
		logger.info(data);
	}
};

module.exports = Game15;