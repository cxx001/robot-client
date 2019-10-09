﻿let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let pomeloClient = require('../net/pomelo-client');
let utils = require('../util/utils');
let UserData = require('../dataMgr/userData');
let RobotCfg = require('../common/robotCfg');
let Game15 = require('./game15');

const C_HOST =  '127.0.0.1';
const C_PORT = 8686;

class Client{
    constructor(openid, gameId, index){
        this.host = C_HOST;
        this.port = C_PORT;
        this.hostGateway = C_HOST;
        this.portGateway = C_PORT;        
        this.code = openid;
		this.openid = openid;
		this.gameId = gameId;
		this.index = index;
        this.mainLoop();
    }

    reset(){
        this.pomelo = null;   
        this.loginData = null; 
        this.userData = null;
    }
    
    async mainLoop(){
        this.reset();
        await this.createConnect();

        this.userData = new UserData();
        this.userData.init(this.pomelo, this.loginData);
        this.pomelo.on('close',this.onClose.bind(this) );
        this.pomelo.on('io-error',this.onError.bind(this) );
        await utils.sleep(1000);

        switch(this.gameId){
			case 15:
				let game15 = new Game15(this);
				await game15.mainLoop();
				break;
			default:
				logger.warn('no exist switch case[%d].', this.gameId);
				this.pomelo.disconnect();
        }
    }

    async onClose(event){       
        logger.info(this.code, 'onClose', event.data);   
        // await utils.sleep(3*1000); 
        // process.nextTick( this.mainLoop.bind(this));
    }

    onError(event){
        logger.error(this.code,'OnError', event );
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
                return pomelo.request("connector.entryHandler.enter",
                                        {
                                            code: this.code,
                                            userInfo: this._getUserInfo(),
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
                    that._handleMaintainState();
                    throw null;
                }
                else {
                    that._onLoginFailed();
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
		let robotInfos = RobotCfg[this.gameId];
		let info = null;
		if (robotInfos && robotInfos[this.index]) {
			info = {
				name: robotInfos[this.index].name,
				gender: robotInfos[this.index].gender,
				avatarUrl: robotInfos[this.index].avatarUrl
			}
		} else {
			info = {
				name: this.code,
				gender: 1,
				avatarUrl: ""
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