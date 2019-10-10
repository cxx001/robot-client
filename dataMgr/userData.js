
class UserData{
    constructor(){
        this.bInited = false;
        this.logined = false; 
    }
    
    // 登录时初始化
    init (pomelo, userInfo) {
        this.pomelo = pomelo ;
        this.logined = true;
		
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

    // 监听服务器推送消息
    _initNetEvent() {
        this.pomelo.on('onjoinClub', (data) => {
			console.log('onjoinClub:', data);
        });
    }
};

module.exports = UserData;