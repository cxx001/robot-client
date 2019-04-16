let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let pomeloClient = require('../net/pomelo-client');
let utils = require('../util/utils');
let playerData = require('../dataMgr/playerData');
let lobby = require('../views/lobby');
let PDK = require('./pdk');

const C_HOST =  '127.0.0.1';
// const C_HOST =  '47.99.50.101';
const C_PORT = 3014;

class Client{
    constructor(openid,pw,gameType,stage){
        this.host = C_HOST;
        this.port = C_PORT;
        this.hostGateway = C_HOST;
        this.portGateway = C_PORT;        
        this.code = openid;
        this.openid = openid;
        this.password = pw ;
		this.gender = 1 ;
		this.gameType = gameType;
		this.stage = stage;
        this.mainLoop();
    }

    reset(){
        this.pomelo = null ;   
        this.loginRespInf = null ; 
        this.playerData = null;
    }
    
    async mainLoop(){
        this.reset();
        await this.createConnect();      

        this.playerData = new playerData();
        this.playerData.init(this.pomelo, this.loginRespInf);
        this.pomelo.on('close',this.onClose.bind(this) );
        this.pomelo.on('io-error',this.onError.bind(this) );
        await utils.sleep(1000);

        let m = 'pdk';
        switch(m){
            case 'lobby':
                let lobby = new lobby(this);
                await lobby.mainLoop();
				break;
			case 'pdk':
				let pdk = new PDK(this);
				await pdk.mainLoop();
				break;
            default:
                logger.error('m:',m);
                break;                                              
        }

        //await utils.sleep(10000);
        //await this.pomelo.disconnect();
    }

    async onClose(event){       
        logger.error(this.code,'onClose', event.data);   
        await utils.sleep(3*1000); 
        process.nextTick( this.mainLoop.bind(this) );
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
                    throw consts.Login.MAINTAIN ;
                }    
                console.log("resp:gate.gateHandler.queryEntry->", data);
                this.host = data.host ;
                this.port = data.port ;   
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
                                            userInfo: this._getLoginUserInfo(),
                                            platform: 'WIN'
                                        });    
            }).then( async(data)=>{     
                if (data.code == consts.Login.RELAY) {
                    console.log("重连 ip:%s port:%s", data.host, data.port);
                    // 重定向
                    await pomelo.disconnect();  
                    throw 'consts.Login.RELAY' ;  
                }
                else if (data.code == consts.Login.OK) {
                    console.log("连接逻辑服 成功 info: ", data.info);
                    this.loginRespInf = data.info ;
                   
                    this.pomelo = pomelo ;                 
                    ok = true ;                       
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

    _getLoginUserInfo(){
        return {
            name:this.openid,
            gender:this.gender,
            avatarUrl:''
        };
    }

    _onLoginFailed(){
       logger.info('------------enter _onLoginFailed');             
    }

    _handleMaintainState(){
        logger.info('------------enter _handleMaintainState');   
    }
};


module.exports = Client ;