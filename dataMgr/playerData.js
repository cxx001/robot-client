
class PlayerData{
    constructor(){
        this.bInited = false;
        this.userInfo = null;
        this.logined = false; 
    }
    // get name() {
    //     return this.userInfo.nickName;
    // }
    // get gender() {
    //     return this.userInfo.gender;
    // }
    // get avatarUrl() {
    //     return this.userInfo.avatarUrl;
    // }

    // 登录时初始化
    init (pomelo, info) {
        this.pomelo = pomelo ;
		this.logined = true;
		this.chairID = 0;

		this.openid = info.openid;
		this.uid = info.uid;
		this.id = info.id;
		this.name = info.name;
		this.gender = info.gender;
		this.avatarUrl = info.avatarUrl;
		this.coins = info.coins;
		this.offlineCoins = info.offlineCoins;
        this.gems = info.gems;
		this.roomid = info.roomid;
		this.goldRoomId = info.goldRoomId;
		
        if (this.bInited)
            return;
        this.bInited = true;

        //this._initNetEvent();
    }

    // 监听服务器推送消息
    _initNetEvent() {
        let self = this;
        this.pomelo.on('onAvatarPropUpdate', function (data) {
            cc.log("角色属性更新", data);
            self.updateProp(data);
        });
    }

    updateProp (data) {
		console.log('玩家信息:', data);
        for (let prop in data) {
            this[prop] = data[prop];
            //eventMgr.emit(eventMgr.events.EventAvtPropUpdate, prop, data[prop]);
        }
    }
};

module.exports = PlayerData;