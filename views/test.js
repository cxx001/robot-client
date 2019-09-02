let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let utils = require('../util/utils');
let pomeloClient = require('../net/pomelo-client');

class Test{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
        this.playerData = client.playerData;
    }
    
	// onUserJoinRoomNotify(data){
    //     logger.info("onUserJoinRoomNotify=",data);
    // }   

    async mainLoop(){
        // 服务器主动推送
		// this.pomelo.on('onUserJoinRoomNotify',this.onUserJoinRoomNotify.bind(this));
        
        //客户端请求
        await this.createConnect();
        this.pomelo.on('close',this.onClose.bind(this) );
        this.pomelo.on('io-error',this.onError.bind(this) );
    }

    async onClose(event){       
        // logger.error(this.code,'onClose', event.data);   
        // await utils.sleep(3*1000); 
        // process.nextTick( this.mainLoop.bind(this) );
    }

    onError(event){
        logger.error(this.code,'OnError', event );
    }

    async createConnect(){
        let ok = false;
        while(true){
            await this.pomelo.request('connector.clubHandler.createClub',{clubName: 'test'}).then((data)=>{
                this.clubId = data.info.clubId;
                return data;
            }).then((data)=>{
                let playwayCfg = {
                    setType: 1,
                    clubId: this.clubId,
                    playwayId: 0,
                    gameId: 15,
                    playwayName: '跑得快',
                    playerCount: 2,
                    gameParameter: {
                        bPlayerCount: 2,
                        bGameCount: 6,
                        b15Or16: 15,
                    },
                }
                return this.pomelo.request('connector.clubHandler.setClubPlayway', playwayCfg);
            }).then((data)=>{
                this.playwayId = data.cfg.id;
                return this.pomelo.request('connector.lobbyHandler.getGameServerAdr', {gameId: 15})
            }).then((data)=>{
                this.ip = data.host;
                this.port = data.port;
                return this.pomelo.disconnect();
            }).then(()=>{
                this.pomelo = new pomeloClient();
                return this.pomelo.init({ host: this.ip, port: this.port, log: true, code: this.client.code }) ;

            }).then(()=>{     
                return this.pomelo.request("table.entryHandler.enter", { 
                    openid: this.playerData.openid,
                    clubId: this.clubId,
                    playwayId: this.playwayId,
                })
                                                                                               
            }).then( async(data)=>{     
                logger.info('完成-------------------')     
                ok = true ;                                                                             
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
};

module.exports = Test ;