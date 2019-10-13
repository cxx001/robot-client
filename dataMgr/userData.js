
class UserData{
    constructor(){
        this.bInited = false;
    }
    
    // 登录时初始化
    init (pomelo, userInfo) {
        this.pomelo = pomelo ;
		this.uid = userInfo.uid;
		this.openid = userInfo.openid;
		this.name = userInfo.name;
		this.gender = userInfo.gender;
		this.avatarUrl = userInfo.avatarUrl;
		this.money = userInfo.money;
		this.createTime = userInfo.createTime;
		this.lastOfflineTime = userInfo.lastOfflineTime;
		this.createTime = userInfo.createTime;
		this.gameInfo = userInfo.gameInfo;
		
        if (this.bInited)
            return;
        this.bInited = true;
        this._initNetEvent();
    }

    _initNetEvent() {
        this.pomelo.on('close',this.onClose.bind(this));
        this.pomelo.on('io-error',this.onError.bind(this));
    }

    async onClose(event){       
        console.log(this.name, 'onClose', event.data);
    }

    async onError(event){
        console.log(this.name, 'onError', event );
    }
};

module.exports = UserData;