let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let pomeloClient = require('../net/pomelo-client');
let utils = require('../util/utils');
let lodash = require('lodash');
let UserData = require('../dataMgr/userData');
let RobotCfg = require('../common/robotCfg');
let Game15 = require('./game15');

const C_HOST =  '127.0.0.1';
const C_PORT = 8686;

class Client{
    constructor(openid, invateCode, index){
		let clubId = Number(String(invateCode).substring(0, 3));
        this.host = C_HOST;
        this.port = C_PORT;
        this.hostGateway = C_HOST;
        this.portGateway = C_PORT;        
        this.code = openid;
		this.openid = openid;
		this.clubId = clubId;
		this.invateCode = invateCode;
		this.index = index;
        this.mainLoop();
    }

    reset(){
        this.pomelo = null;   
        this.loginData = null; 
		this.userData = null;
		this.playways = null;
    }
    
    async mainLoop(){
		this.reset();
		
		// 登入
        await this.createConnect();
        this.userData = new UserData();
        this.userData.init(this.pomelo, this.loginData);
        this.pomelo.on('close',this.onClose.bind(this));
        this.pomelo.on('io-error',this.onError.bind(this));
		await utils.sleep(1000);
		
		// 进入俱乐部
		this.pomelo.request('connector.clubHandler.enterClub', {clubId: this.clubId}).then((data)=>{
			if (data.code == consts.ClubCode.OK) {
				// 进入成功
				this.enterTable()
			} else if(data.code == consts.ClubCode.CLUB_PLAYER_NO_EXIST) {
				// 玩家不在俱乐部
				this.pomelo.request('connector.clubHandler.joinClubByCode', {invateCode: this.invateCode}).then((data)=>{
					if (data.code != consts.ClubCode.OK) {
						logger.error('join club error:', data);
						this.pomelo.disconnect();
						return;
					}
					this.enterTable()
				});
			} else{
				logger.error('enter club error:', data);
				this.pomelo.disconnect();
				return;
			}
		});

		// 进入游戏
        // switch(gameId){
		// 	case 15:
		// 		let game15 = new Game15(this);
		// 		await game15.mainLoop();
		// 		break;
		// 	default:
		// 		logger.warn('no exist switch case[%d].', gameId);
		// 		this.pomelo.disconnect();
        // }
	}
	
	async enterTable() {
		// TODO:暂时简单处理，随机延时加入
		let time = utils.randomInt(1, 10)
		await utils.sleep(time);

		let ok = false;
        while(true) {
			// 是否设置了玩法
			await this.pomelo.request('connector.clubHandler.getClubPlayway', {clubId: this.clubId}).then((data)=>{
				if (data.code != 0) {
					throw '获取俱乐部玩法失败!';
				}
				this.playways = data.playways;
				if (this.playways.length > 0) {
					return this.playways;
				}
			}).then((data) => {
				// 获取现有桌子
				return this.pomelo.request('connector.clubHandler.getClubTable', {clubId: this.clubId});
			}).then((data) => {
				if (data.code != 0) {
					throw '获取俱乐部桌子信息失败!';
				}
				let playway = lodash.sample(this.playways);
				let tableInfos = data.tableInfos;
				if (tableInfos.length <= 0) {
					// 创建桌子
					return this.pomelo.request('connector.lobbyHandler.enterTable', {gameId: playway.gameId});
				} else {
					for (let i = 0; i < tableInfos.length; i++) {
						const table = tableInfos[i];
						if (table.players.length < table.chairCount) {
							// 加入没满桌子
							return xxx;
						}
					}
					return this.pomelo.request('connector.lobbyHandler.enterTable', {gameId: playway.gameId});
				}
			}).then((data)=>{
				this.ip = data.host;
				this.port = data.port;
				return this.pomelo.disconnect();
			}).then(()=>{
				this.pomelo = new pomeloClient();
				return this.pomelo.init({ host: this.ip, port: this.port, log: true, code: this.code}) ;
			}).then(()=>{
				return this.pomelo.request("table.entryHandler.enter", {
					openid: this.openid,
					clubId: this.clubId,
					playwayId: this.playwayId,
				})
			}).catch((err)=>{
				logger.error(err);
			})

			if( ok ){
                break;
            }else{
                await utils.sleep(3*1000);
            }
		}
	}

    async onClose(event){       
        logger.info(this.code, 'onClose', event.data);   
        // await utils.sleep(3*1000); 
        // process.nextTick( this.mainLoop.bind(this));
    }

    async onError(event){
        logger.error(this.code,'onError', event );
    }

    async createConnect(){
        let ok = false;
        while(true){
            let pomelo = new pomeloClient();
            let r = await pomelo.init({ host: this.hostGateway, port: this.portGateway, log: true, code:this.code } ).then( ()=>{
                // 获取逻辑服 地址
                return  pomelo.request("gate.gateHandler.queryEntry", { code: this.code });
            }).then((data)=>{
                if (data.code == consts.Login.MAINTAIN) {
                    this._handleMaintainState();
                    throw consts.Login.MAINTAIN;
                }
                this.host = data.host;
                this.port = data.port;
                return pomelo.disconnect();    
            }).then(()=>{
                //connenct 逻辑服
                pomelo = new pomeloClient();
                return pomelo.init({ host: this.host, port: this.port, log: true, code:this.code } ) ;
            }).then(()=>{
				//login
				let userInfo = this._getUserInfo();
				if (!userInfo) {
					this._onLoginFailed();
                    throw 'robot config no exist.';
				}
                return pomelo.request("connector.entryHandler.enter",
                                        {
                                            code: this.code,
                                            userInfo: userInfo,
                                            platform: 'WIN'
                                        });
            }).then( async(data)=>{     
                if (data.code == consts.Login.RELAY) {
                    console.log("重连 ip:%s port:%s", data.host, data.port);
                    // 重定向
                    await pomelo.disconnect();  
                    throw 'consts.Login.RELAY';  
                }
                else if (data.code == consts.Login.OK) {
                    console.log("连接逻辑服成功 info: ", data.info);
                    this.loginData = data.info;
                    this.pomelo = pomelo;                 
                    ok = true;                  
                }
                else if (data.code == consts.Login.MAINTAIN) {
                    this._handleMaintainState();
                    throw null;
                }
                else {
                    this._onLoginFailed();
                    throw null;
                }                                                                                 
            }).catch((err)=>{
                logger.error(this.code+":createConnect err:"+err);
            });

            if( ok ){
                break;
            }else{
                await utils.sleep(3*1000);
            }
        }
    }

    _getUserInfo(){
		let robotInfos = RobotCfg[this.clubId];
		let info = null;
		if (robotInfos && robotInfos[this.index-1]) {
			let robotData = robotInfos[this.index-1];
			info = {
				name: robotData.name,
				gender: robotData.gender,
				avatarUrl: robotData.avatarUrl
			}
		}
        return info;
    }

    _onLoginFailed(){
		logger.info('------------enter _onLoginFailed');
    }

    _handleMaintainState(){
        logger.info('------------enter _handleMaintainState');
    }
};

module.exports = Client;