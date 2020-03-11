/**
 * Date: 2020/3/2
 * Author: admin
 * Description: 游戏辅助函数
 */
'use strict';
var lodash = require('lodash');
var pro = module.exports;

//////////////////////////////////////////////////////////////////////////
//数值掩码
var MASK_COLOR = 0xF0								//花色掩码
var MASK_VALUE = 0x0F								//数值掩码

/////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////
//扑克数据
var m_cbCardData = [
	0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D,				//黑桃 A - K
	0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1A,0x1B,0x1C,0x1D,				//红桃 A - K
	0x21,0x22,0x23,0x24,0x25,0x26,0x27,0x28,0x29,0x2A,0x2B,0x2C,0x2D,				//梅花 A - K
	0x31,0x32,0x33,0x34,0x35,0x36,0x37,0x38,0x39,0x3A,0x3B,0x3C,0x3D,				//方块 A - K
];

///////////////////////////////////////////////////////////////////////////////////////////////////

pro.NuiType = {
	NiuType_NULL: 0,		//无牛
	NiuType_1: 1,			//牛1
	NiuType_2: 2,			//牛2
	NiuType_3: 3,			//牛3
	NiuType_4: 4,			//牛4
	NiuType_5: 5,			//牛5
	NiuType_6: 6,			//牛6
	NiuType_7: 7,			//牛7
	NiuType_8: 8,			//牛8
	NiuType_9: 9,			//牛9
	NiuType_Niu: 10,		//牛牛
	NiuType_Silver: 20,		//四花牛
	NiuType_Gold: 30,		//五花牛	
	NiuType_Bomb: 50,		//炸弹牛
	NiuType_Niu5: 60,		//五小牛
};

//混乱扑克
pro.RandCardList = function()
{
    var cbCardData = m_cbCardData.slice(0);
	let tempArr = lodash.shuffle(cbCardData);
	tempArr = lodash.shuffle(tempArr);
	return tempArr;
}

//排列扑克
pro.SortCardList = function(cbCardData, cbCardCount)
{
	//数目过虑
	if (cbCardCount==0) return;

	//转换数值
	var cbSortValue = [];
	for (let i=0;i<cbCardCount;i++) cbSortValue[i] = exp.GetCardLogicValue(cbCardData[i]);	

	//排序操作
	var bSorted=true;
	var cbThreeCount,cbLast=cbCardCount-1;
	do
	{
		bSorted=true;
		for (let i=0;i<cbLast;i++)
		{
			//20131022
			if(i>=cbCardCount-1)
			{
				bSorted = false;
				break;
			}

			if ((cbSortValue[i]<cbSortValue[i+1])||
				((cbSortValue[i]==cbSortValue[i+1])&&(cbCardData[i]<cbCardData[i+1])))
			{
				//交换位置
				cbThreeCount	= cbCardData[i];
				cbCardData[i]	= cbCardData[i+1];
				cbCardData[i+1]	= cbThreeCount;
				cbThreeCount	= cbSortValue[i];
				cbSortValue[i]	= cbSortValue[i+1];
				cbSortValue[i+1]= cbThreeCount;
				bSorted=false;
			}	
		}
		cbLast--;
	} while(bSorted==false);
}

//逻辑数值
pro.GetCardLogicValue = function(cbCardData)
{
	//扑克属性
	let cbCardColor=pro.GetCardColor(cbCardData);
	let cbCardValue=pro.GetCardValue(cbCardData);

	//转换数值
	if (cbCardColor==0x40) return cbCardValue+2;
	return (cbCardValue<=2)?(cbCardValue+13):cbCardValue;
}

//获取数值
pro.GetCardValue = function(cbCardData) { return cbCardData&MASK_VALUE; }
//获取花色
pro.GetCardColor = function(cbCardData) { return cbCardData&MASK_COLOR; }


////////////////////////////////////////

//比牌逻辑
pro.AnalysebCardData = function(cbHandCardData)
{
	let cbCardData = cbHandCardData.slice(0);	//扑克
	let cbValueType = pro.NuiType.NiuType_NULL;	//0-10 11银花牛 12金花牛 13炸弹牛 14五小牛
	let cbMaxValue = 0;				//手里最大一个值
	
	//最大值
	for (let j = 0; j < 5; j++)
	{
		if (cbMaxValue == 0 || (((cbCardData[j]&0x0F) > (cbMaxValue&0x0F)) || ((cbCardData[j]&0x0F) == (cbMaxValue&0x0F) && (cbCardData[j]&0xF0) < (cbMaxValue&0xF0))))
		{
			cbMaxValue = cbCardData[j];
		}
	}

	let isHaveNiu = false;
	if (isHaveNiu == false) {
		//五小牛
		let cbFiveValue = 0;
		for (let j = 0; j < 5; j++)
		{
			cbFiveValue += (cbCardData[j]&0x0F);
			if ((cbCardData[j]&0x0F) >= 5)
			{
				cbFiveValue += 100;
			}
		}
		if (cbFiveValue <= 10)
		{
			cbValueType = pro.NuiType.NiuType_Niu5;
			isHaveNiu = true;
		}
	}
	
	//炸弹牛
	if (isHaveNiu == false)
	{
		let bCardIndex = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		for (let j = 0; j < 5; j++)
		{
			bCardIndex[(cbCardData[j]&0x0F)]++;
		}
		let cbValue = 0;
		for (let j = 0; j < 20; j++)
		{
			if (bCardIndex[j] >= 4)
			{
				cbValue = j;
				break;
			}
		}
		if (cbValue != 0)
		{
			cbValueType = pro.NuiType.NiuType_Bomb;
			isHaveNiu = true;
		}
	}

	if (isHaveNiu == false)
	{
		for (let j = 0; j < 5; j++)
		{
			for (let m = j+1; m < 5; m++)
			{
				for (let n = m+1; n < 5; n++)
				{
					let cbValue1 = (cbCardData[j]&0x0F)<=10?(cbCardData[j]&0x0F):10;
					let cbValue2 = (cbCardData[m]&0x0F)<=10?(cbCardData[m]&0x0F):10;
					let cbValue3 = (cbCardData[n]&0x0F)<=10?(cbCardData[n]&0x0F):10;
					let cbValue = cbValue1+cbValue2+cbValue3;
					if (cbValue % 10 == 0)
					{
						isHaveNiu = true;
						cbValue = 0;
						for (let z = 0; z < 5; z++)
						{
							if (z != j && z != m && z != n)
							{
								cbValue += (cbCardData[z]&0x0F)<=10?(cbCardData[z]&0x0F):10;
							}
						}
						cbValueType = cbValue%10;//牛几
						if (cbValueType == 0)
						{
							if ((cbCardData[0]&0x0F)>10 && (cbCardData[1]&0x0F)>10 && (cbCardData[2]&0x0F)>10 && (cbCardData[3]&0x0F)>10 && (cbCardData[4]&0x0F)>10)
							{
								//金花牛
								cbValueType = pro.NuiType.NiuType_Gold;
							}else if ((cbCardData[0]&0x0F)>=10 && (cbCardData[1]&0x0F)>=10 && (cbCardData[2]&0x0F)>=10 && (cbCardData[3]&0x0F)>=10 && (cbCardData[4]&0x0F)>=10)
							{
								//银花牛
								cbValueType = pro.NuiType.NiuType_Silver;
							}else
							{
								//牛牛
								cbValueType = pro.NuiType.NiuType_Niu;
							}
						}
						break;
					}
					if (isHaveNiu)break;
				}
				if (isHaveNiu)break;
			}
			if (isHaveNiu)break;
		}
	}
	
	let stuCompareCard = {}
	stuCompareCard.cbCardData = cbHandCardData;
	stuCompareCard.cbValueType = cbValueType;
	stuCompareCard.cbMaxValue = cbMaxValue;
	stuCompareCard.cbFanBei = pro.GetFanBei(cbValueType);
	stuCompareCard.cbLastCardData = cbCardData[4];
	return stuCompareCard;
}

pro.GetFanBei = function(cbValueType)
{
	let bMultiple = 1;
	if (cbValueType >= pro.NuiType.NiuType_Silver) {
		bMultiple = 4;
	} else if (cbValueType == pro.NuiType.NiuType_Niu) {
		bMultiple = 3;
	} else if(cbValueType >= pro.NuiType.NiuType_7) {
		bMultiple = 2;
	} else {
		bMultiple = 1;
	}
	return bMultiple;
}
