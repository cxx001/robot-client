let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let pdkHelper = require('../helper/pdkHelper');
let sleep = require('../util/utils').sleep; 

//扑克类型
let CT_ERROR					= 0									//错误类型
let CT_SINGLE					= 1									//单牌类型
let CT_DOUBLE					= 2									//对牌类型
let CT_SINGLE_LINE				= 3									//单连类型
let CT_DOUBLE_LINE				= 4									//对连类型
let CT_THREE_LINE				= 5									//三连类型
let CT_THREE_LINE_TAKE_TWO		= 6									//三带两单
let CT_FOUR_LINE_TAKE_THREE		= 7									//四带三单
let CT_BOMB_CARD				= 8									//炸弹类型

// 跑得快机器人

class PDK{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
		this.playerData = client.playerData;
		this.stage = client.stage;
		this.gameType = client.gameType;
		this.schedule = null;
		
		// 数据
		this.wChairID = null;
		this.wCurrentUser = null;
		this.cbCardData = null;
		this.bCardCount = null;
		this.turnCardCount = 0;
		this.turnCardData = [];

		this.bNextWarn = false;
		this.outcardUser = 0;
	}

	/* *************************  Logic begin  ************************* */
	//机器人出牌
	AISearchOutCard()
	{
		pdkHelper.SortCardList(this.cbCardData,this.bCardCount);
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
			let AnalyseResult = pdkHelper.AnalysebCardData(this.cbCardData,this.bCardCount);
			
			//两手出牌，有 2 先出 2
			if (pdkHelper.GetCardLogicValue(this.cbCardData[0])==15
				&&pdkHelper.GetCardType(this.cbCardData,this.bCardCount)==CT_ERROR
				&&this.bCardCount>1)
			{
				let cbLeftCardData = this.cbCardData.slice(1, this.cbCardData.length);
				if (pdkHelper.GetCardType(cbLeftCardData,this.bCardCount-1)!=CT_ERROR)
				{
					OutCard.bCardData[0]=this.cbCardData[0];
					OutCard.bCardCount = 1;
					IScanOut =  true;
				}
			}
			//最后三张牌，带2，所以出中间一个牌
			if (pdkHelper.GetCardLogicValue(this.cbCardData[0])==15 && this.bCardCount==3 && this.bNextWarn == false)
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
				if(AnalyseResult.cbFourCount>0) bombVlue = pdkHelper.GetCardLogicValue(AnalyseResult.cbFourCardData[0]);
				//搜索连牌
				for (let i=this.bCardCount-1;i>=5;i--)
				{
					//获取数值
					let cbHandLogicValue=pdkHelper.GetCardLogicValue(this.cbCardData[i]);
					//构造判断
					if (cbHandLogicValue>10)break;
					if(IScanOut==true)break;
					//搜索连牌
					let cbLineCount=0;
					for (let j=i;j>=0;j--)
					{
						if ((pdkHelper.GetCardLogicValue(this.cbCardData[j])-cbLineCount) ==cbHandLogicValue
							&&bombVlue!=pdkHelper.GetCardLogicValue(this.cbCardData[j])
							&&pdkHelper.GetCardLogicValue(this.cbCardData[j])<15) //不能拆炸弹
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
				if(pdkHelper.GetCardLogicValue(AnalyseResult.cbThreeCardData[AnalyseResult.cbThreeCount*3-1])==3)
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
				if(AnalyseResult.cbFourCount>0) bombVlue = pdkHelper.GetCardLogicValue(AnalyseResult.cbFourCardData[AnalyseResult.cbFourCount*4-1]);
				TempTurnCard[0] =0x03;
				TempTurnCard[1] =0x03;
				TempTurnCard[2] =0x03;
				TempTurnCard[3] =0x04;
				TempTurnCard[4] =0x05;
				TempTurnCount = 5;
				if (pdkHelper.SearchOutCard(this.cbCardData,this.bCardCount,TempTurnCard,TempTurnCount,OutCardResult)==true)
				{
					if (OutCardResult.cbCardCount==5)
					{
						//开始打JJJ以上 带二 不允许
						if(pdkHelper.GetCardLogicValue(OutCardResult.cbResultCard[0])>11&&this.bCardCount>10)
						{
							IScanOut = false;
						}
						else //if(pdkHelper.GetCardLogicValue(OutCardResult.cbResultCard[0])!=bombVlue)
						{
							//炸弹不能拆
							let isBomb = false;
							let outvalue = pdkHelper.GetCardLogicValue(OutCardResult.cbResultCard[0]);
							for (let i = 0; i < AnalyseResult.cbFourCount; i+=4) {
								let value = pdkHelper.GetCardLogicValue(AnalyseResult.cbFourCardData[i]);
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
					let  cbHandLogicValue=pdkHelper.GetCardLogicValue(AnalyseResult.cbDoubleCardData[AnalyseResult.cbDoubleCount*2-1]);
					//搜索连牌
					let cbLineCount=0;
					let DoubleHand = [];
					let Index = AnalyseResult.cbDoubleCount*2-1;
					do
					{
						if (((pdkHelper.GetCardLogicValue(AnalyseResult.cbDoubleCardData[Index])-cbLineCount)==cbHandLogicValue)
							&&((pdkHelper.GetCardLogicValue(AnalyseResult.cbDoubleCardData[Index-1])-cbLineCount)==cbHandLogicValue))
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
				FirstLogV = pdkHelper.GetCardLogicValue(this.cbCardData[this.bCardCount-1]);
				wSameCardNum = 0;
				for(let i=0;i<this.bCardCount;i++)
				{
					if (FirstLogV== pdkHelper.GetCardLogicValue(this.cbCardData[this.bCardCount-1-i]))
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
				if (pdkHelper.SearchOutCard(this.cbCardData,this.bCardCount,TempTurnCard,TempTurnCount,OutCardResult)==true)
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
			if (pdkHelper.GetCardType(this.cbCardData,this.bCardCount)!=CT_ERROR)
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
			// 			if (0x03 == pdkHelper.GetCardLogicValue(this.cbCardData[this.bCardCount-1-i]))
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
			let cbTurnOutType=pdkHelper.GetCardType(this.turnCardData,this.turnCardCount);
			let AnalyseResult = pdkHelper.AnalysebCardData(this.cbCardData,this.bCardCount);
			let OutCardResult = {
				cbCardCount: 0,		//扑克数目
				cbResultCard: []	//结果扑克
			};
			if (pdkHelper.SearchOutCard(this.cbCardData,this.bCardCount,this.turnCardData,this.turnCardCount,OutCardResult)==true)
			{
				let OutCard = {
					bCardCount: 0,				//出牌数目
					bCardData: [],				//扑克列表
					wOutCardUser: 0             //出牌玩家
				};
				if(AnalyseResult.cbFourCount>0&&cbTurnOutType!=CT_BOMB_CARD)
				{    //****************如果把炸弹拆了，强制出炸弹***********************
					for(let i=0;i<OutCardResult.cbCardCount;i++)
					{
						if (pdkHelper.GetCardLogicValue(OutCardResult.cbResultCard[i])
							==pdkHelper.GetCardLogicValue(AnalyseResult.cbFourCardData[0]))
						{
							OutCard.bCardData = AnalyseResult.cbFourCardData.slice(0);
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
					OutCard.bCardData[0] = pdkHelper.GetHandMaxCard(this.cbCardData,this.bCardCount);
					OutCard.bCardCount = 1;
				}
				else if (OutCard.bCardCount==1&&this.bCardCount>1)
				{
					pdkHelper.SortCardList(this.cbCardData,this.bCardCount);
					if (pdkHelper.GetCardLogicValue(this.cbCardData[1])>pdkHelper.GetCardLogicValue(this.turnCardData[0]))
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

	GetChairIDByUid(uid, players) {
		for (const key in players) {
			if (players.hasOwnProperty(key)) {
				const user = players[key];
				if (uid == user.id) {
					return user.chairID;
				}
			}
		}
	};

	async PlayOutCard(lower, upper) {
		if (this.wCurrentUser == this.wChairID) {
			let OutCard = this.AISearchOutCard();
			if (OutCard && OutCard.bCardData.length > 0) {
				// 出牌
				let msg = {
					bCardData: OutCard.bCardData,
					bCardCount: OutCard.bCardCount
				}
				lower = lower || 2000;
				upper = upper || 4000;
				await sleep(Math.floor(Math.random() * (upper - lower)) + lower);
				await this.pomelo.request('table.tableHandler.playCard', msg).then((data)=>{})
			} else {
				logger.info("要不起[%s]", this.wChairID);
			}
		}
	};

	StartSchedule() {
		this.StopSchedule();
		let lower = 1000 * 10;
		let upper = 1000 * 20;
		let dt = Math.floor(Math.random() * (upper - lower)) + lower;
		this.schedule = setTimeout(function () {
			this.StopSchedule();
			this.pomelo.request('table.tableHandler.leaveRoom', {}).then((data)=>{})
		}.bind(this), dt);
	};

	StopSchedule() {
		if (this.schedule) {
			clearTimeout(this.schedule);
			this.schedule = null;
		}
	};

	/* *************************  resv begin  ************************* */

	async onUserEntryRoom(data){
		//自己进入房间自动准备
		let self = this;
		if (this.playerData.id == data.id) {
			this.playerData.chairID = data.chairID;
			let lower = 2000;
			let upper = 4000;
			await sleep(Math.floor(Math.random() * (upper - lower)) + lower);
			await this.pomelo.request('table.tableHandler.readyGame', {}).then((data)=>{
				if (data.code != consts.ReadyGameCode.OK) {
					self.StopSchedule();
					if (data.code != consts.ReadyGameCode.GAME_STARTED) {
						self.pomelo.request('table.tableHandler.leaveRoom', {}).then((data)=>{})
					}
				} else {
					self.StartSchedule();
				}
			})
		}
	}
	
	async onStartGame(data){
		this.StopSchedule();
		this.wCurrentUser = data.wCurrentUser;
		this.cbCardData = data.cbCardData;
		this.bCardCount = this.cbCardData.length
		this.wChairID = data.wChairID;
		this.turnCardCount = 0;
		this.turnCardData = [];
		this.bNextWarn = false;
		this.PlayOutCard(3000, 5000);
	}

	async onOutCard(data){
		if (!this.cbCardData) {
			logger.warn('[%d] maybe is reconnect. and onOutCard is fronted.', this.wChairID);
			return;
		}

		// 删除扑克
		if (data.outcardUser == this.wChairID) {
			if(pdkHelper.RemoveCard(data.cardData,data.cardCount,this.cbCardData,this.bCardCount) == false)
			{
				logger.warn('[%d] remove card fail. maybe is reconnect!', this.wChairID);
				// return;
			}
		}

		// 更新数据
		this.wCurrentUser = data.currentUser;
		this.turnCardCount = data.cardCount;
		this.turnCardData = data.cardData;
		this.outcardUser = data.outcardUser;
		this.bCardCount = this.cbCardData.length;
	
		// 出牌
		this.PlayOutCard();
	}

	async onSettlement(data){
		let self = this;
		let lower = 2000;
		let upper = 6000;
		await sleep(Math.floor(Math.random() * (upper - lower)) + lower);
		await this.pomelo.request('table.tableHandler.readyGame', {}).then((data)=>{
			if (data.code != consts.ReadyGameCode.OK) {
				self.StopSchedule();
				self.pomelo.request('table.tableHandler.leaveRoom', {}).then((data)=>{})
			} else{
				self.StartSchedule();
			}
		})
	}

	async onWarnUser(data){
		if (data.wWarnUser==(this.wChairID+1)%3)
		{
			this.bNextWarn = true;
		}
	}

	async onLeaveRoom(data){
		if (data.wChairID == this.playerData.chairID) {
			let msg = {
				gameType: this.gameType,
				stage: this.stage
			}
			this.pomelo.request('connector.matchHandler.enterGoldRoom', msg).then((data)=>{})
		}
	}

	async onPassCard(data){
		this.wCurrentUser = data.wCurrentUser;
		if (this.outcardUser == this.wCurrentUser) {
			// 都要不起
			this.turnCardCount = 0;
			this.turnCardData = [];
		}

		// 出牌
		this.PlayOutCard();
	}
	
	/* *************************  msg begin  ************************* */

    async mainLoop(){
		this.pomelo.on('onUserEntryRoom',this.onUserEntryRoom.bind(this));
		this.pomelo.on('onStartGame',this.onStartGame.bind(this));
		this.pomelo.on('onWarnUser',this.onWarnUser.bind(this));
		this.pomelo.on('onOutCard',this.onOutCard.bind(this));
		this.pomelo.on('onPassCard',this.onPassCard.bind(this));
		this.pomelo.on('onSettlement',this.onSettlement.bind(this));
		this.pomelo.on('onLeaveRoom',this.onLeaveRoom.bind(this));

		let self = this;
		let goldRoomId = this.playerData.goldRoomId;
		if (goldRoomId != '0') {
			// 重连进入房间
			let msg = {goldRoomId: goldRoomId};
			await this.pomelo.request('connector.matchHandler.joinGoldRoom', msg).then((data)=>{
				if (data.code != consts.RoomCode.OK) {
					// 进入房间
					let msg = {
						gameType: this.gameType,
						stage: this.stage
					}
					this.pomelo.request('connector.matchHandler.enterGoldRoom', msg).then((resp)=>{})
				} else {
					if (data.roomInfo.status == consts.TableStatus.START) {
						let cardInfo = data.roomInfo.cardInfo;
						this.wCurrentUser = cardInfo.currentUser;
						this.cbCardData = cardInfo.handCardData;
						this.wChairID = self.GetChairIDByUid(this.playerData.id, data.roomInfo.players);
						this.bNextWarn = cardInfo.bUserWarn[(this.wChairID+1)%3];
						if (cardInfo.turnUser == this.wCurrentUser) {
							this.turnCardData = [];
							this.turnCardCount = 0;
						} else{
							this.turnCardData = cardInfo.turnCardData;
							this.turnCardCount = cardInfo.turnCardCount;
						}

						self.PlayOutCard(1000, 1500);
						this.pomelo.request('table.tableHandler.autoCard', {bAuto: 0}).then((resp)=>{})
					}
				}
			})
		} else {
			// 进入房间
			let msg = {
				gameType: this.gameType,
				stage: this.stage
			}
			await this.pomelo.request('connector.matchHandler.enterGoldRoom', msg).then((data)=>{})
		}
    }
};

module.exports = PDK ;