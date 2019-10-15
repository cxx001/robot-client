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

	async init(){
		logger.info('-----------游戏模块初始化:%d-----------', this.client.gameId);
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
			logger.error('[%d] onOutCard is handcard error.', this.userData.name);
			return;
		}

		//删除扑克
		if (data.outcardUser == this.myChairID) {
			if(Game15Logic.RemoveCard(data.cardData,data.cardCount,this.cbCardData,this.bCardCount) == false)
			{
				logger.info(data.cardData,data.cardCount,this.cbCardData,this.bCardCount);
				logger.error('用户[%s]出牌删除失败.', this.userData.name);
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
			}
			else if(data.code == 3) {
				//大结算
				this.client.mainLoop();
			} else{
				this.pomelo.request('table.tableHandler.leaveRoom', {}, (data) => {
					// 离开游戏
					if (data.code == 0 || data.code == 3) {
						this.client.mainLoop();
					} else{
						logger.warn('用户[%s]离开房间失败!', this.userData.name)
					}
				})
			}
		})
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
			let OutCard = this.AISearchOutCard();
			if (OutCard && OutCard.bCardData.length > 0) {
				let msg = {
					bCardData: OutCard.bCardData,
					bCardCount: OutCard.bCardCount
				}
				logger.info('用户[%s] 出牌:%o', this.userData.name, msg)
				lower = lower || 2000;
				upper = upper || 4000;
				await utils.sleep(utils.randomInt(lower, upper));
				await this.pomelo.request('table.tableHandler.playCard', msg, (data) => {});
			} else {
				logger.info("要不起[%s]", this.userData.name);
			}
		}
	}

	//机器人出牌 TODO:移植代码待整理
	AISearchOutCard()
	{
		Game15Logic.SortCardList(this.cbCardData,this.bCardCount);
		if (this.turnCardCount==0)
		{
			let OutCard = {
				bCardCount: 0,		//出牌数目
				bCardData: [],		//扑克列表
				wOutCardUser: 0,  	//出牌玩家
			};
			let IScanOut = false;
			let TempTurnCard = [], TempTurnCount;
			let OutCardResult = {
				cbCardCount: 0,		//扑克数目
				cbResultCard: []	//结果扑克
			};
			let AnalyseResult = Game15Logic.AnalysebCardData(this.cbCardData,this.bCardCount);
			
			//两手出牌，有 2 先出 2
			if (Game15Logic.GetCardLogicValue(this.cbCardData[0])==15
				&&Game15Logic.GetCardType(this.cbCardData,this.bCardCount)==Game15Logic.CardType.CT_ERROR
				&&this.bCardCount>1)
			{
				let cbLeftCardData = this.cbCardData.slice(1, this.cbCardData.length);
				if (Game15Logic.GetCardType(cbLeftCardData,this.bCardCount-1)!=Game15Logic.CardType.CT_ERROR)
				{
					OutCard.bCardData[0]=this.cbCardData[0];
					OutCard.bCardCount = 1;
					IScanOut =  true;
				}
			}
			//最后三张牌，带2，所以出中间一个牌
			if (Game15Logic.GetCardLogicValue(this.cbCardData[0])==15 && this.bCardCount==3 && this.bNextWarn == false)
			{
				OutCard.bCardData[0]=this.cbCardData[1];
				OutCard.bCardCount = 1;
				IScanOut =  true;
			}
			if(IScanOut==false)  //********单顺****************
			{
				//////**********************2011年6月7日 17:52:13*******************************////
				//分析扑克
				let SigneHand = [], SigneCount=0, bombVlue=0;
				if(AnalyseResult.cbFourCount>0) bombVlue = Game15Logic.GetCardLogicValue(AnalyseResult.cbFourCardData[0]);
				//搜索连牌
				for (let i=this.bCardCount-1;i>=5;i--)
				{
					//获取数值
					let cbHandLogicValue=Game15Logic.GetCardLogicValue(this.cbCardData[i]);
					//构造判断
					if (cbHandLogicValue>10)break;
					if(IScanOut==true)break;
					//搜索连牌
					let cbLineCount=0;
					for (let j=i;j>=0;j--)
					{
						if ((Game15Logic.GetCardLogicValue(this.cbCardData[j])-cbLineCount) ==cbHandLogicValue
							&&bombVlue!=Game15Logic.GetCardLogicValue(this.cbCardData[j])
							&&Game15Logic.GetCardLogicValue(this.cbCardData[j])<15) //不能拆炸弹
						{
							//增加连数
							SigneHand[cbLineCount++]=this.cbCardData[j];
						}
					}
					if (cbLineCount>=5) //完成判断
					{
						OutCard.bCardData = SigneHand.slice(0);
						OutCard.bCardCount = cbLineCount;
						IScanOut = true;
					}
				}
				/////********************************************************************/////
			}
			///// 333 带 2
			if(AnalyseResult.cbThreeCount>0&&this.bCardCount>=5&&IScanOut==false)
			{
				if(Game15Logic.GetCardLogicValue(AnalyseResult.cbThreeCardData[AnalyseResult.cbThreeCount*3-1])==3)
				{
					if(AnalyseResult.cbSignedCount>=2) //优先带单牌
					{
						let pos = AnalyseResult.cbThreeCount*3-3;
						OutCard.bCardData = AnalyseResult.cbThreeCardData.slice(pos, pos + 3);
						OutCard.bCardData[3] =AnalyseResult.cbSignedCardData[AnalyseResult.cbSignedCount-1];
						OutCard.bCardData[4] =AnalyseResult.cbSignedCardData[AnalyseResult.cbSignedCount-2];
					}
					else
					{
						let pos = this.bCardCount-5;
						OutCard.bCardData = this.cbCardData.slice(pos, pos + 5);
					}

					OutCard.bCardCount = 5;
					IScanOut = true;
				}
			}
			//最后一把
			if(AnalyseResult.cbThreeCount==1&&this.bCardCount<=4&&IScanOut==false)
			{
				OutCard.bCardData = this.cbCardData.slice(0);
				OutCard.bCardCount = this.bCardCount;
				IScanOut = true;
			}

			if (IScanOut==false) //三带二
			{
				TempTurnCard = [];
				let bombVlue=0;
				if(AnalyseResult.cbFourCount>0) bombVlue = Game15Logic.GetCardLogicValue(AnalyseResult.cbFourCardData[AnalyseResult.cbFourCount*4-1]);
				TempTurnCard[0] =0x03;
				TempTurnCard[1] =0x03;
				TempTurnCard[2] =0x03;
				TempTurnCard[3] =0x04;
				TempTurnCard[4] =0x05;
				TempTurnCount = 5;
				if (Game15Logic.SearchOutCard(this.cbCardData,this.bCardCount,TempTurnCard,TempTurnCount,OutCardResult)==true)
				{
					if (OutCardResult.cbCardCount==5)
					{
						//开始打JJJ以上 带二 不允许
						if(Game15Logic.GetCardLogicValue(OutCardResult.cbResultCard[0])>11&&this.bCardCount>10)
						{
							IScanOut = false;
						}
						else //if(Game15Logic.GetCardLogicValue(OutCardResult.cbResultCard[0])!=bombVlue)
						{
							//炸弹不能拆
							let isBomb = false;
							let outvalue = Game15Logic.GetCardLogicValue(OutCardResult.cbResultCard[0]);
							for (let i = 0; i < AnalyseResult.cbFourCount; i++) {
								let value = Game15Logic.GetCardLogicValue(AnalyseResult.cbFourCardData[i*4]);
								if (outvalue == value) {
									isBomb = true;
								}
							}

							if (!isBomb) {
								OutCard.bCardData = OutCardResult.cbResultCard.slice(0);
								OutCard.bCardCount = OutCardResult.cbCardCount;
								IScanOut = true;
							}
						}
					}
				}
			}
			if (IScanOut==false)  //双顺
			{
				if(AnalyseResult.cbDoubleCount>1)
				{
					//获取数值
					let  cbHandLogicValue=Game15Logic.GetCardLogicValue(AnalyseResult.cbDoubleCardData[AnalyseResult.cbDoubleCount*2-1]);
					//搜索连牌
					let cbLineCount=0;
					let DoubleHand = [];
					let Index = AnalyseResult.cbDoubleCount*2-1;
					do
					{
						if (((Game15Logic.GetCardLogicValue(AnalyseResult.cbDoubleCardData[Index])-cbLineCount)==cbHandLogicValue)
							&&((Game15Logic.GetCardLogicValue(AnalyseResult.cbDoubleCardData[Index-1])-cbLineCount)==cbHandLogicValue))
						{
							//增加连数
							DoubleHand[cbLineCount*2]=AnalyseResult.cbDoubleCardData[Index];
							DoubleHand[(cbLineCount++)*2+1]=AnalyseResult.cbDoubleCardData[Index-1];
						}
						Index-=2;
					}while (Index>0);
					//完成判断
					if (cbLineCount>=2)
					{
						OutCard.bCardData = DoubleHand.slice(0);
						OutCard.bCardCount = cbLineCount*2;
						IScanOut = true;
					}
				}
			}
			let wSameCardNum =0;
			if (IScanOut==false)
			{
				let FirstLogV;
				FirstLogV = Game15Logic.GetCardLogicValue(this.cbCardData[this.bCardCount-1]);
				wSameCardNum = 0;
				for(let i=0;i<this.bCardCount;i++)
				{
					if (FirstLogV== Game15Logic.GetCardLogicValue(this.cbCardData[this.bCardCount-1-i]))
						OutCard.bCardData[wSameCardNum++]= this.cbCardData[this.bCardCount-1-i];
					else break;
				}
				if (wSameCardNum==3)
				{
					OutCard.bCardData = OutCard.bCardData.slice(0, 2);
					wSameCardNum = 2;
				}

				// 首回合不出炸弹
				if (wSameCardNum == 4 && AnalyseResult.cbSignedCount > 0) {
					OutCard.bCardData = [AnalyseResult.cbSignedCardData[AnalyseResult.cbSignedCount-1]];
					OutCard.bCardCount = 1;
				} else{
					OutCard.bCardCount = wSameCardNum;
				}
			}
			//下家报警，单牌出最大
			if (this.bNextWarn==true&&wSameCardNum==1)
			{
				let TempTurnCard = [],TempTurnCount;
				TempTurnCount = 2;
				TempTurnCard[0] =3;
				TempTurnCard[1] =3;
				let OutCardResult = {
					cbCardCount: 0,		//扑克数目
					cbResultCard: []	//结果扑克
				};
				if (Game15Logic.SearchOutCard(this.cbCardData,this.bCardCount,TempTurnCard,TempTurnCount,OutCardResult)==true)
				{
					OutCard.bCardData = OutCardResult.cbResultCard.slice(0);
					OutCard.bCardCount = OutCardResult.cbCardCount;
				}
				else 
				{
					OutCard.bCardData[0] = this.cbCardData[0];
					OutCard.bCardCount = 1;
				}
			}
			//一次出完 
			if (Game15Logic.GetCardType(this.cbCardData,this.bCardCount)!=Game15Logic.CardType.CT_ERROR)
			{
				if (this.bCardCount<=6&&AnalyseResult.cbFourCount>0)
				{
					OutCard.bCardData = AnalyseResult.cbFourCardData.slice(0, 4);
					OutCard.bCardCount = 4;
				}
				else
				{
					OutCard.bCardData = this.cbCardData.slice(0);
					OutCard.bCardCount = this.bCardCount;
				}
			}
			//机器人当庄,起手黑桃3
			// if (this.bCardCount == 15)
			// {
			// 	let i=0;
			// 	for ( ; i<OutCard.bCardCount; i++)
			// 	{
			// 		if (OutCard.bCardData[i] == 0x03)
			// 		{
			// 			break;
			// 		}
			// 	}
			// 	//没有黑桃3
			// 	if ( i == OutCard.bCardCount)
			// 	{
			// 		wSameCardNum = 0;
			// 		for(let i=0;i<this.bCardCount;i++)
			// 		{
			// 			if (0x03 == Game15Logic.GetCardLogicValue(this.cbCardData[this.bCardCount-1-i]))
			// 				OutCard.bCardData[wSameCardNum++]= this.cbCardData[this.bCardCount-1-i];
			// 			else break;
			// 		}
			// 		if (wSameCardNum==3)
			// 		{
			// 			OutCard.bCardData = OutCard.bCardData.slice(0, 2);
			// 			wSameCardNum = 2;
			// 		}
			// 		OutCard.bCardCount = wSameCardNum;
			// 	}
			// }
			// m_pIAndroidUserItem->SendSocketData(REC_SUB_C_OUT_CART,&OutCard,sizeof(OutCard));
			return OutCard;
		}
		else
		{
			//获取类型
			let cbTurnOutType=Game15Logic.GetCardType(this.turnCardData,this.turnCardCount);
			let AnalyseResult = Game15Logic.AnalysebCardData(this.cbCardData,this.bCardCount);
			let OutCardResult = {
				cbCardCount: 0,		//扑克数目
				cbResultCard: []	//结果扑克
			};
			if (Game15Logic.SearchOutCard(this.cbCardData,this.bCardCount,this.turnCardData,this.turnCardCount,OutCardResult)==true)
			{
				let OutCard = {
					bCardCount: 0,				//出牌数目
					bCardData: [],				//扑克列表
					wOutCardUser: 0             //出牌玩家
				};
				if(AnalyseResult.cbFourCount>0&&cbTurnOutType!=Game15Logic.CardType.CT_BOMB_CARD)
				{    //****************如果把炸弹拆了，强制出炸弹***********************
					for(let i=0;i<OutCardResult.cbCardCount;i++)
					{
						let isBomb = false;
						let outvalue = Game15Logic.GetCardLogicValue(OutCardResult.cbResultCard[i]);
						for (let i = 0; i < AnalyseResult.cbFourCount; i++) {
							let value = Game15Logic.GetCardLogicValue(AnalyseResult.cbFourCardData[i*4]);
							if (outvalue == value) {
								isBomb = true;
							}
						}

						if (isBomb)
						{
							OutCard.bCardData = AnalyseResult.cbFourCardData.slice(AnalyseResult.cbFourCount*4-4, AnalyseResult.cbFourCount*4);
							OutCard.bCardCount = 4;
							// m_pIAndroidUserItem->SendSocketData(REC_SUB_C_OUT_CART,&OutCard,sizeof(OutCard));
							return OutCard;
						}
					}
				}
				OutCard.bCardData = OutCardResult.cbResultCard.slice(0);
				OutCard.bCardCount = OutCardResult.cbCardCount;

				//下家报警，单牌出最大
				if (this.bNextWarn==true&&OutCard.bCardCount==1)
				{
					OutCard.bCardData[0] = Game15Logic.GetHandMaxCard(this.cbCardData,this.bCardCount);
					OutCard.bCardCount = 1;
				}
				else if (OutCard.bCardCount==1&&this.bCardCount>1)
				{
					Game15Logic.SortCardList(this.cbCardData,this.bCardCount);
					if (Game15Logic.GetCardLogicValue(this.cbCardData[1])>Game15Logic.GetCardLogicValue(this.turnCardData[0]))
					{
						OutCard.bCardData[0] = this.cbCardData[1];
						OutCard.bCardCount = 1;
					}
				}
				// m_pIAndroidUserItem->SendSocketData(REC_SUB_C_OUT_CART,&OutCard,sizeof(OutCard));
				return OutCard;
			}
			else
			{
				// m_pIAndroidUserItem->SendSocketData(REC_SUB_C_PASS_CARD);
			}
		}
		return;
	}
};

module.exports = Game15;