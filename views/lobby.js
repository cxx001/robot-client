let consts = require('../common/consts');
let logger = require('../util/logger').getLogger();
let utils = require('../util/utils');

class Lobby{
    constructor( client ){
        this.client = client ;
        this.pomelo = client.pomelo ;
        this.playerData = client.playerData;
	}
	
	onUserJoinRoomNotify(data){
        logger.info("onUserJoinRoomNotify=",data);
    }   

    async mainLoop(){
		this.pomelo.on('onUserJoinRoomNotify',this.onUserJoinRoomNotify.bind(this));
		
		// await this.pomelo.request('connector.lobbyHandler.createRoom',{roomCfg:{playerCount:2}}).then((data)=>{
		// 	logger.info('connector.lobbyHandler.createRoom=',data)
		// })

		await this.pomelo.request('connector.lobbyHandler.joinRoom',{roomid: 671639}).then((data)=>{
			logger.info('connector.lobbyHandler.joinRoom=',data)
        })
        
        await this.pomelo.request('pdk.pdkHandler.readyGame',{}).then((data)=>{
			logger.info('pdk.pdkHandler.readyGame=',data)
		})

		// await this.pomelo.request('pdk.pdkHandler.leaveRoom',{}).then((data)=>{
		// 	logger.info('pdk.pdkHandler.leaveRoom=',data)
		// })
    }
};


module.exports = Lobby ;