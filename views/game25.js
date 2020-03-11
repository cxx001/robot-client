let utils = require('../util/utils')
let Game25Logic = require('./game25Logic');

class Game25{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.userData = client.userData;
		this.logger = client.logger;
		this._initNetEvent();
		this.reset();
	}

	reset() {
		this._stopLeaveSchedule();
		this._stopGameSchedule();
		this.tableCfg = null;
		this.myChairID = null;
		this.handCardData = null;
		this.stuCompareCard = null;
		this.wBankerUser = null;
	}

	_initNetEvent() {
		this.pomelo.on('onSendParameter',this.onSendParameter.bind(this));
		this.pomelo.on('onSendGameScene',this.onSendGameScene.bind(this));
		this.pomelo.on('onUserEntryRoom',this.onUserEntryRoom.bind(this));
		this.pomelo.on('onStartGame',this.onStartGame.bind(this));
		this.pomelo.on('onConfirmBanker', this.onConfirmBanker.bind(this));
		this.pomelo.on('onSendLastCard', this.onSendLastCard.bind(this));
		this.pomelo.on('onSettlement',this.onSettlement.bind(this));
		this.pomelo.on('onDissolveRoom', this.onDissolveRoom.bind(this));
	}

	onSendParameter(data){
		this.tableCfg = data;
	}

	async onSendGameScene(data){
		this.myChairID = data.wChairID;
		if (data.gameStatus == 2) {
			// 已经开始游戏
			this.handCardData = data.handCardData;
			this.stuCompareCard = data.stuCompareCard;
			this.wBankerUser = data.bankerUser;
		} else {
			// 准备界面
			await utils.sleep(utils.randomInt(2000, 4000));
			await this.pomelo.request('table.tableHandler.readyGame', {}, (data) => {
				if (data.code == 0 || data.code == 1) {
					this._startLeaveSchedule();
				} else if(data.code == 3) {
					// 资金不足
					this.logger.warn('资金不足!');
					this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
						// 离开游戏
						this.logger.info('资金不足离开房间. code=', data.code);
					})
				} else {
					// 其它错误
					this.logger.warn('准备游戏异常:code = %d', data.code);
				}
			})
		}
	}

	onUserEntryRoom(data){
		if (this.userData.uid == data.id) {
			this.myChairID = data.chairID;
		}
	}

	async onStartGame(data){
		if (!data.wChairID || data.wChairID == 65535) {
			// 旁观玩家
			this.pomelo.request('table.tableHandler.lookPlayerSeat', {}, (data) => {
				if (data.code != 0) {
					this.logger.warn('入座失败:code=', data.code);
					this.client.mainLoop();
				}
			})
			return;
		}
		this.logger.info(data.cbCardData, data.wChairID);
		this._stopLeaveSchedule();
		this._stopGameSchedule();
		this.handCardData = data.cbCardData;
		this.myChairID = data.wChairID;
		this.stuCompareCard = Game25Logic.AnalysebCardData(this.handCardData);
		this.logger.info('手牌信息:', this.stuCompareCard);
		// 抢庄
		await utils.sleep(utils.randomInt(1000, 3000));
		let bMultiple = this.stuCompareCard.cbFanBei - 1;
		await this.pomelo.request('table.tableHandler.grabBanker', {bMultiple: bMultiple}, (data) => {})
	}

	async onConfirmBanker(data) {
		this.wBankerUser = data.wBankerUser;
		if (this.wBankerUser != this.myChairID && !this.isHalfJoin()) {
			// 闲家下注
			await utils.sleep(utils.randomInt(1000, 3000));
			let bBetting = this.stuCompareCard.cbFanBei;
			await this.pomelo.request('table.tableHandler.betting', {bBetting: bBetting}, (data) => {})
		}
	}

	async onSendLastCard(data) {
		// 明牌阶段
		if (this.isHalfJoin()) {
			return;
		}
		await utils.sleep(utils.randomInt(2000, 5000));
		await this.pomelo.request('table.tableHandler.showCard', {}, (data) => {})
	}

	async onSettlement(data){
		this.logger.info('结算:', data);
		this.reset();
		await utils.sleep(utils.randomInt(2000, 5000));
		await this.pomelo.request('table.tableHandler.readyGame', {}, (data) => {
			if (data.code == 0) {
				this._startLeaveSchedule();
			} else if(data.code == 2 || data.code == 401) {
				//大结算
				this.client.mainLoop();
			} else if(data.code == 3) {
				// 资金不足
				this.logger.warn('资金不足!');
				this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
					// 离开游戏
					this.logger.info('资金不足离开房间. code=', data.code);
				})
			} else {
				this.logger.warn('准备游戏错误:code = %d', data.code);
			}
		})
	}

	async onDissolveRoom(data) {
		this.logger.info('俱乐部[%d]中桌子[%d]已经回收.', data.clubId, data.tableId);
		this.client.mainLoop();
	}

	_startLeaveSchedule() {
		if (this.myChairID == 0) {
			// 房主不离开
			this._startGameSchedule();
			return;
		}

		this._stopLeaveSchedule();
		let dt = 60 * 1000;
		this.leaveSchedule = setTimeout(() => {
			this.leaveSchedule = null;
			this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
				// 离开游戏
				if (data.code == 0 || data.code == 3) {
					this.client.mainLoop();
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

	_startGameSchedule() {
		this._stopGameSchedule();
		let dt = 10 * 1000;
		this.startSchedule = setTimeout(() => {
			this.startSchedule = null;
			this.pomelo.request('table.tableHandler.handStartGame', {}, (data) => {
				// 开始游戏
				if (data.code == 3) {
					// 人数不足
					this._startGameSchedule();
				} else {
					if (data.code != 0) {
						this.logger.error('手动开始游戏错误! code=', data.code);
					}
				}
			})
		}, dt);
	};

	_stopGameSchedule() {
		if (this.startSchedule) {
			clearTimeout(this.startSchedule);
			this.startSchedule = null;
		}
	};

	isHalfJoin() {
		if (this.handCardData && this.handCardData.length == 5) {
			return false;
		}
		this.logger.info('中途加入.');
		return true;
	}
};

module.exports = Game25;