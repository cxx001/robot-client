/**
 * Date: 2019/8/29
 * Author: admin
 * Description: 常量文件
 */
module.exports = {
	INVALID_CHAIR: 65535, 	   //无效用户

	Code: {
        OK: 0,
        FAIL: 1
	},
	
	// 平台
    Platform: {
        WIN: "win",
        WECHAT: "wechat",
	},

	Login: {
        OK: 200,  		// 成功
        RELAY: 201,     // 重新登入
        MAINTAIN: 202,  // 维护
        FAIL: 500       // 失败
	},

	CheckInResult: {
        SUCCESS: 0,  		// 成功
        ALREADY_ONLINE: 1,  // 已经在线
	},

	ServerAdrCode: {
		OK: 0,
		GAME_SERVER_NO_OPEN: 1, //游戏服未开启
		GAME_SERVER_NO_EXIST: 2, //游戏服不存在
	},

	GameStatus: {
		GAME_FREE: 0,  //没在游戏中
		GAME_PLAYING: 1, //游戏中
	},

	EnterTableCode: {
        OK: 0,
		NO_EXIST_ROOM: 1, //房间不存在
		FULL_PLAYER_ROOM: 2, //房间人数已满
		GAME_MAINTAIN: 3, //游戏维护中
		GAME_RELAY: 4, //不在同一个游戏服进程，告诉客户端重连
		OTHER_FAIL: 5, // 其它错误
	},

    TableStatus: {
		FREE: 0,    //初始化
		READY: 1, 	//准备界面
		START: 2,   //游戏开始
	},

	ReadyGameCode: {
		OK: 0,
		GAME_STARTED: 1,    //游戏已经开始  
		GAME_END: 2,        //游戏结束
	},

	LeaveRoomCode: {
		OK: 0,
		NO_EXIST_ROOM: 1,   //房间不存在
		START_GAME_NO_LEAVE: 2, //游戏已经开始不能离开牌桌
		LEAVE_ROOM_DISSOLVE: 3, //房间解散
	},

	ReadyState: {
		Ready_No: 0,    	//没有准备
		Ready_Yes: 1,  		//已经准备
	},

	// 解散状态
	DissolveState: {
		Diss_Init: 0,      	//初始状态(或拒绝)
		Diss_Send: 1, 		//发起方
		Diss_Agree: 2, 		//同意
		Diss_Undone: 3,  	//未处理
		Diss_Achive: 4,     //解散成功
	},

	// 解散游戏code
	DissolveCode: {
		OK: 0,
		GAME_NO_START: 1,   //游戏没有开始没有解散操作
	},

	PlayCardCode: {
		OK: 0,
		NO_TURN_OUT_CARD: 1, //没有轮到自己出牌
		OUT_CARD_TYPE_ERROR: 2, //出牌类型错误
	},

	// 俱乐部code
	ClubCode: {
		OK: 0,
		CLUB_NAME_ERROR: 1,   //名字不合法
		CLUB_NO_EXIST: 2, 	//俱乐部不存在
		CLUB_ID_ERROR: 3,	//俱乐部ID错误
		CLUB_SET_PLAYWAY_TYPE_ERROR: 4, //设置玩法类型错误
		CLUB_ALREADY_APPLY: 5,   //已经申请
		CLUB_MEMBER_NOIN_APPLY_LIST: 6,  //成员不在申请列表
		CLUB_PLAYWAY_NO_EXIST: 7,  //俱乐部玩法不存在
	},
}