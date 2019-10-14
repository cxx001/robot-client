let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let utils = require('../util/utils')
let Game15Logic = require('./game15Logic');

class Game15{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.userData = client.userData;
		this._initNetEvent();
		this.reset();
	}

	reset() {
		this.myChairID = null;
		this.tableCfg = null;
		this.leaveSchedule = null;
	}

	_initNetEvent() {
		this.pomelo.on('onSendParameter',this.onSendParameter.bind(this));
		this.pomelo.on('onSendGameScene',this.onSendGameScene.bind(this));
		this.pomelo.on('onUserEntryRoom',this.onUserEntryRoom.bind(this));
		this.pomelo.on('onStartGame',this.onStartGame.bind(this));
		this.pomelo.on('onWarnUser',this.onWarnUser.bind(this));
		this.pomelo.on('onOutCard',this.onOutCard.bind(this));
		this.pomelo.on('onPassCard',this.onPassCard.bind(this));
		this.pomelo.on('onSettlement',this.onSettlement.bind(this));
		this.pomelo.on('onLeaveRoom',this.onLeaveRoom.bind(this));
	}

    async mainLoop(){
		logger.info('-----------进入游戏:%d-----------', this.client.gameId);
		
	}
	
	onSendParameter(data){
		this.tableCfg = data;
	}

	onSendGameScene(data){
		if (data.gameStatus == 2) {
			// 已经开始游戏
		} else {
			// 准备界面
			await utils.sleep(utils.randomInt(2, 4) * 1000);
			await this.pomelo.request('table.tableHandler.readyGame', {}, (data) => {
				if (data.code == 0) {
					this._startLeaveSchedule();
				}
			})
		}
	}

	onUserEntryRoom(data){
		if (this.userData.uid != data.id && data.readyState == 0) {
			this._startLeaveSchedule();
		}
		this.myChairID = data.chairID;
	}

	onLeaveRoom(data){
	}

	onStartGame(data){
		logger.info(data);
	}

	onWarnUser(data){
		logger.info(data);
	}

	onOutCard(data){
		logger.info(data);
	}

	onPassCard(data){
		logger.info(data);
	}

	onSettlement(data){
		logger.info(data);
	}

	_startLeaveSchedule() {
		this._stopLeaveSchedule();
		let dt = utils.randomInt(10, 20) * 1000;
		this.leaveSchedule = setTimeout(() => {
			this.leaveSchedule = null;
			this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
				// 离开游戏
				if (data.code == 0 || data.code == 3) {
					
				}
			})
		}, dt);
	};

	_stopLeaveSchedule() {
		if (this.leaveSchedule) {
			clearTimeout(this.leaveSchedule);
			this.leaveSchedule = null;
		}
	};
};

module.exports = Game15;