let utils = require('../util/utils')
let Game15Logic = require('./game15Logic');

class Game15{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.userData = client.userData;
		this.logger = client.logger;
		this._initNetEvent();
		this.reset();
	}

	async init(){
		this.logger.info('-----------游戏模块初始化:%d-----------', this.client.gameId);
	}

	reset() {
		this.tableCfg = null;
		this.leaveSchedule = null;
		this.myChairID = null;
		this.wCurrentUser = null;
		this.cbCardData = null;
		this.bCardCount = null;
		this.turnCardData = null;
		this.turnCardCount = null;
		this.bNextWarn = null;
		this.outcardUser = null;
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
		this.pomelo.on('onDissolveRoom', this.onDissolveRoom.bind(this));
	}

	onSendParameter(data){
		this.tableCfg = data;
	}

	async onSendGameScene(data){
		if (data.gameStatus == 2) {
			// 已经开始游戏
			let gameParameter = this.tableCfg.gameParameter;
			this.wCurrentUser = data.currentUser;
			this.cbCardData = data.handCardData;
			this.bCardCount = this.cbCardData.length;
			this.myChairID = Game15Logic.GetChairIDByUid(this.userData.uid, data.players);
			this.bNextWarn = data.bUserWarn[(this.myChairID+1)%gameParameter.bPlayerCount];
			if (data.turnUser == this.wCurrentUser) {
				this.turnCardData = [];
				this.turnCardCount = 0;
			} else{
				this.turnCardData = data.turnCardData;
				this.turnCardCount = data.turnCardCount;
			}
			this.AIPlayOutCard(1000, 2000);
		} else {
			// 准备界面
			await utils.sleep(utils.randomInt(2000, 4000));
			await this.pomelo.request('table.tableHandler.readyGame', {}, (data) => {
				if (data.code == 0 || data.code == 1) {
					this._startLeaveSchedule();
				} else if(data.code == 4) {
					// 资金不足
					this.logger.info('资金不足离开房间.');
					this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
						// 离开游戏
						if (data.code == 0 || data.code == 3) {
							this.client.mainLoop();
						} else{
							this.logger.error('离开游戏错误 code:', data.code);
						}
					})
				} else {
					// 其它错误
					this.logger.warn('准备游戏错误:code = %d', data.code);
				}
			})
		}
	}

	onUserEntryRoom(data){
		if (this.userData.uid != data.id) {
			if (data.readyState == 0) {
				this._startLeaveSchedule();
			}
		} else{
			this.myChairID = data.chairID;
		}
	}

	onStartGame(data){
		this._stopLeaveSchedule();
		this.myChairID = data.wChairID;
		this.wCurrentUser = data.wCurrentUser;
		this.cbCardData = data.cbCardData;
		this.bCardCount = this.cbCardData.length;
		this.turnCardData = [];
		this.turnCardCount = 0;
		this.bNextWarn = false;
		this.AIPlayOutCard(4000, 6000);
	}

	onWarnUser(data){
		let gameParameter = this.tableCfg.gameParameter;
		if (data.wWarnUser==(this.myChairID+1)%gameParameter.bPlayerCount)
		{
			this.bNextWarn = true;
		}
	}

	onOutCard(data){
		if (!this.cbCardData) {
			this.logger.error('onOutCard is handcard error.');
			return;
		}

		//删除扑克
		if (data.outcardUser == this.myChairID) {
			if(Game15Logic.RemoveCard(data.cardData,data.cardCount,this.cbCardData,this.bCardCount) == false)
			{
				this.logger.error('出牌删除失败:', data.cardData,data.cardCount,this.cbCardData,this.bCardCount);
				return;
			}
		}

		// 更新数据
		this.wCurrentUser = data.currentUser;
		this.outcardUser = data.outcardUser;
		this.bCardCount = this.cbCardData.length;
		this.turnCardData = data.cardData;
		this.turnCardCount = data.cardCount;
		
		// 出牌
		this.AIPlayOutCard();
	}

	onPassCard(data){
		this.wCurrentUser = data.wCurrentUser;
		if (this.outcardUser == this.wCurrentUser) {
			// 都要不起
			this.turnCardData = [];
			this.turnCardCount = 0;
		}
		// 出牌
		this.AIPlayOutCard();
	}

	async onSettlement(data){
		await utils.sleep(utils.randomInt(2000, 6000));
		await this.pomelo.request('table.tableHandler.readyGame', {}, (data) => {
			if (data.code == 0) {
				this._startLeaveSchedule();
			} else if(data.code == 3) {
				//大结算
				this.client.mainLoop();
			} else if(data.code == 4) {
				// 资金不足
				this.logger.info('资金不足离开房间.');
				this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
					// 离开游戏
					if (data.code == 0 || data.code == 3) {
						this.client.mainLoop();
					} else{
						this.logger.error('离开游戏错误 code:', data.code);
					}
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
		this._stopLeaveSchedule();
		let dt = utils.randomInt(10 * 1000, 20 * 1000);
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

	async AIPlayOutCard(lower, upper) {
		if (this.wCurrentUser == this.myChairID) {
			let OutCard = Game15Logic.AISearchOutCard(this.cbCardData, this.turnCardData, this.bNextWarn);
			if (OutCard && OutCard.bCardData.length > 0) {
				let msg = {
					bCardData: OutCard.bCardData,
					bCardCount: OutCard.bCardCount
				}
				this.logger.info('出牌:%o', msg);
				lower = lower || 2000;
				upper = upper || 4000;
				await utils.sleep(utils.randomInt(lower, upper));
				await this.pomelo.request('table.tableHandler.playCard', msg, (data) => {});
			} else {
				this.logger.info("要不起.");
			}
		}
	}
};

module.exports = Game15;