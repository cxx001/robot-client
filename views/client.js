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
        this.code = openid;
		this.openid = openid;
		this.clubId = clubId;
		this.invateCode = invateCode;
		this.index = index;
        this.mainLoop();
    }

    reset(){
		if (this.pomelo) {
			this.pomelo.disconnect();
			this.pomelo = null; 
		}
        this.loginData = null; 
		this.userData = null;
        this.playways = null;
		this.gameId = null;
		this.tableId = null;
    }
    
    async mainLoop(){
		this.reset();
		
		// 登入大厅
        await this.createConnect();
        this.userData = new UserData();
        this.userData.init(this.pomelo, this.loginData);
		await utils.sleep(1000);
		
		// 进入俱乐部
		await this.enterClub();
    }
    
    async createConnect(){
        let ok = false;
        while(true){
            let pomelo = new pomeloClient();
            let r = await pomelo.init({ host: C_HOST, port: C_PORT, log: true, code:this.code } ).then( ()=>{
                // 获取逻辑服 地址
                return  pomelo.request("gate.gateHandler.queryEntry", { code: this.code });
            }).then((data)=>{
                if (data.code == 202) {
                    this._handleMaintainState();
                    throw '服务器维护中';
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
                if (data.code == 201) {
                    console.log("重连 host:%s port:%s", data.host, data.port);
                    // 重定向
                    await pomelo.disconnect();  
                    throw '重新登入';  
                }
                else if (data.code == 200) {
                    console.log("连接逻辑服成功 info: ", data.info);
                    this.loginData = data.info;
                    this.pomelo = pomelo;                 
                    ok = true;                  
                }
                else if (data.code == 202) {
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

    async enterClub() {
        this.pomelo.request('connector.clubHandler.enterClub', {clubId: this.clubId}).then((data)=>{
			if (data.code == 0) {
				// 进入成功
				this.findTable()
			} else if(data.code == 6) {
				// 玩家不在俱乐部
				this.pomelo.request('connector.clubHandler.joinClubByCode', {invateCode: this.invateCode}).then((data)=>{
					if (data.code != 0) {
						logger.error('join club error:', data);
						this.pomelo.disconnect();
						return;
					}
					this.findTable()
				});
			} else{
				logger.error('enter club error:', data);
				this.pomelo.disconnect();
				return;
			}
		});
    }
	
	async findTable() {
		// TODO:暂时简单处理，随机延时加入
		let time = utils.randomInt(1, 10) * 1000;
        await utils.sleep(time);
        
        // 是否已经在牌桌里了
        let gameInfo = this.loginData.gameInfo;
        if (gameInfo.code == 1) {
            let info = gameInfo.gameInfo;
            logger.info('%s已经在牌桌. gameInfo = %o', this.code, info);
            this.gameId = info.gameId
            this.tableId = info.tableId;
            this.enterTable(info.host, info.port);
            return;
        }

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
				} else{
                    logger.info('俱乐部[%d]还没有设置玩法.', this.clubId);
                    throw '请先设置俱乐部玩法.'
                }
			}).then((data) => {
				// 获取现有桌子
				return this.pomelo.request('connector.clubHandler.getClubTable', {clubId: this.clubId});
			}).then((data) => {
				if (data.code != 0) {
					throw '获取俱乐部桌子信息失败!';
				}
                let playway = lodash.sample(this.playways);
                this.gameId = playway.gameId;
                this.playwayId = playway.id;
				let tableInfos = data.tableInfos;
				if (tableInfos.length <= 0) {
                    // 创建桌子
                    logger.info('创建桌子 playway = ', playway);
					return this.pomelo.request('connector.lobbyHandler.enterTable', {gameId: playway.gameId});
				} else {
					for (let i = 0; i < tableInfos.length; i++) {
						const table = tableInfos[i];
						if (table.players.length < table.chairCount) {
                            // 加入没满桌子
                            logger.info('加入桌子 table = ', table);
                            this.tableId = table.tableId;
							return table;
						}
                    }
                    logger.info('创建桌子2 playway = ', playway);
					return this.pomelo.request('connector.lobbyHandler.enterTable', {gameId: playway.gameId});
				}
			}).then((data)=>{
				this.host = data.host;
                this.port = data.port;
                ok = this.enterTable(this.host, this.port);
			}).catch((err)=>{
				logger.warn(err);
			})

			if( ok ){
                break;
            }else{
                logger.info('重新循环查找桌子')
                await utils.sleep(3*1000);
                this.pomelo.disconnect();
                await this.createConnect();
            }
		}
    }
    
    async enterTable(host, port) {
        let ok = false;
        this.pomelo.disconnect();
        this.pomelo = new pomeloClient();

        await this.pomelo.init({ host: host, port: port, log: true, code:this.code });

        let msg = {
            openid: this.openid,
            clubId: this.clubId,
            playwayId: this.playwayId || '',
            tableId: this.tableId || 0,
        }
        await this.pomelo.request("table.entryHandler.enter", msg, (data) => {
            if (data.code == 0) {
                ok = true;
                logger.info('%s加入牌桌成功.', this.code);
                this.enterGame(this.gameId);
                
            } else{
                logger.warn('%s加入牌桌失败. data = %o', this.code, data);
            }
        })

        return ok;
    }

    async enterGame(gameId) {
        switch(gameId){
            case 15:
                let game15 = new Game15(this);
                await game15.mainLoop();
                break;
            default:
                logger.warn('no exist switch gameId[%d].', gameId);
                this.pomelo.disconnect();
        }
    }
};

module.exports = Client;