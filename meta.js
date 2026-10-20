/* ============================================================
 * 短剧元数据（频道/语言/发布时间/点赞数/评论数）
 * 数据来源：youtube_short_dramas.csv（YouTube 当前快照）
 * ============================================================ */
'use strict';
const DRAMA_META = {
  "RTOkwoDJifo": {"channel": "DramaMuse", "lang": "英文", "pubDate": "2026/9/21", "likes": 134794, "comments": 3500},
  "iqlSvK0sH60": {"channel": "Whisper of Romantic", "lang": "英文", "pubDate": "2026/6/18", "likes": 59141, "comments": 1500},
  "CKthsw8GI28": {"channel": "LuLu甜劇社-Drama", "lang": "中文", "pubDate": "2025/12/25", "likes": 38121, "comments": 2400},
  "WNdiGl5oBDM": {"channel": "Bingo Reels", "lang": "英文", "pubDate": "2026/7/11", "likes": 26819, "comments": 1300},
  "OAOAyzO-v-o": {"channel": "Scarlet Letters ??", "lang": "英文", "pubDate": "2026/8/25", "likes": 16302, "comments": 758},
  "D_fDXa_GauY": {"channel": "Heartthrob Dramas", "lang": "英文", "pubDate": "2026/9/9", "likes": 29613, "comments": 1300},
  "Yjq-zprJgYc": {"channel": "FlipThatDrama", "lang": "英文", "pubDate": "2026/7/6", "likes": 23829, "comments": 863},
  "yymHvV8fl68": {"channel": "DubDrama Central", "lang": "英文", "pubDate": "2026/1/29", "likes": 16547, "comments": 519},
  "pI8yohbkjvI": {"channel": "Dramely", "lang": "英文", "pubDate": "2026/7/30", "likes": 8441, "comments": 435},
  "hqwqOmtz0gA": {"channel": "Circuit Dramas", "lang": "英文", "pubDate": "2025/10/22", "likes": 7752, "comments": 290},
  "hpyeiCWZ084": {"channel": "软糖短剧场", "lang": "中文", "pubDate": "2026/9/1", "likes": 11682, "comments": 342},
  "PqBWNDtCYGQ": {"channel": "Eve DramaTV", "lang": "英文", "pubDate": "2026/10/7", "likes": 14458, "comments": 245},
  "uj3c2sNXjpk": {"channel": "ReelShort", "lang": "英文", "pubDate": "2025/10/10", "likes": 8727, "comments": 504},
  "ueueGajC6yI": {"channel": "Hero AI Dramas", "lang": "英文", "pubDate": "2026/8/13", "likes": 8027, "comments": 366},
  "ez6nVRI2jok": {"channel": "Butterfly ShortDrama", "lang": "英文", "pubDate": "2026/9/20", "likes": 16678, "comments": 540},
  "eI28raQMgko": {"channel": "ShortMax - Watch Dramas & Show", "lang": "英文", "pubDate": "2026/2/21", "likes": 7373, "comments": 263},
  "vNWWkL4dmZo": {"channel": "風月短劇社", "lang": "中文", "pubDate": "2026/8/31", "likes": 7410, "comments": 161},
  "xf12_sgUAgY": {"channel": "青瓜甜劇場", "lang": "中文", "pubDate": "2026/10/2", "likes": 4126, "comments": 121},
  "2t2FhD21kSQ": {"channel": "Velvet Romance", "lang": "英文", "pubDate": "2026/8/21", "likes": 7881, "comments": 253},
  "vq0HdEUWWS0": {"channel": "Scarlet Letters ??", "lang": "英文", "pubDate": "2026/9/18", "likes": 8852, "comments": 397},
  "DLk8yeAF1VA": {"channel": "Girl's Heart Short Drama Hall", "lang": "英文", "pubDate": "2026/9/20", "likes": 7407, "comments": 336},
  "QJIh2sYYaLA": {"channel": "AI Tap Drama", "lang": "英文", "pubDate": "2026/7/20", "likes": 8823, "comments": 289},
  "vYIAwm8Vpa8": {"channel": "Romantic Mini Drama", "lang": "英文", "pubDate": "2026/8/26", "likes": 4199, "comments": 213},
  "AdFPQ6N9Nb4": {"channel": "星火剧场SuperDrama", "lang": "中文", "pubDate": "2026/9/12", "likes": 7092, "comments": 380},
  "gh8usE-IM6Q": {"channel": "ReelShort", "lang": "英文", "pubDate": "2025/10/18", "likes": 5774, "comments": 182},
  "pJcwNlyJCN0": {"channel": "風月短劇社", "lang": "中文", "pubDate": "2026/8/27", "likes": 4455, "comments": 77},
  "rVOPKM6RA0M": {"channel": "Mini Drama Zone", "lang": "英文", "pubDate": "2026/7/7", "likes": 8715, "comments": 249},
  "Zsij047yyjU": {"channel": "Mini Drama Diary", "lang": "英文", "pubDate": "2026/1/20", "likes": 1910, "comments": 78},
  "yj6DzWTuhEg": {"channel": "PureLove Drama", "lang": "英文", "pubDate": "2026/8/13", "likes": 3908, "comments": 131},
  "P9_C_-lhOtM": {"channel": "DesireDrama", "lang": "英文", "pubDate": "2026/9/23", "likes": 3238, "comments": 103},
  "sgnRxLZLoE8": {"channel": "ShortMax - Watch Dramas & Show", "lang": "英文", "pubDate": "2026/1/26", "likes": 5287, "comments": 183},
  "rERVpc8oQdg": {"channel": "ReelShort", "lang": "英文", "pubDate": "2025/12/17", "likes": 4725, "comments": 174},
  "BQ116t3xCww": {"channel": "NINI ShortDrama", "lang": "英文", "pubDate": "2026/8/22", "likes": 5119, "comments": 186},
  "eSY-nnevD10": {"channel": "Rill Drama", "lang": "英文", "pubDate": "2026/8/13", "likes": 5927, "comments": 363},
  "4ugHErvceLM": {"channel": "DramaBox - Stream Drama Shorts", "lang": "英文", "pubDate": "2025/8/31", "likes": 3281, "comments": 67},
  "mU9XkJBmCMk": {"channel": "Hush Drama", "lang": "英文", "pubDate": "2026/9/25", "likes": 2363, "comments": 57},
  "_2vooaasy4o": {"channel": "LorenaDrama", "lang": "英文", "pubDate": "2026/9/18", "likes": 4921, "comments": 215},
  "gTUO815fJPc": {"channel": "小水短剧", "lang": "中文", "pubDate": "2026/9/26", "likes": 3676, "comments": 162},
  "YR6m6MiRoFQ": {"channel": "ReelSeries+", "lang": "英文", "pubDate": "2026/8/27", "likes": 1388, "comments": 100},
  "UAvgP0Rfo00": {"channel": "KissCipher", "lang": "英文", "pubDate": "2026/9/25", "likes": 2758, "comments": 58},
  "e7kuZGPRhkE": {"channel": "BingeDrama Daily", "lang": "英文", "pubDate": "2026/9/30", "likes": 2849, "comments": 143},
  "315ZsGVEcBE": {"channel": "雲端劇場", "lang": "中文", "pubDate": "2026/4/11", "likes": 2354, "comments": 76},
  "uP9lSvB3TBM": {"channel": "HoneyLove Drama", "lang": "英文", "pubDate": "2026/9/25", "likes": 1917, "comments": 52},
  "nXTKhMJbdM4": {"channel": "Blooming Shorts Drama", "lang": "英文", "pubDate": "2026/9/8", "likes": 5543, "comments": 183},
  "91mWdtYAnME": {"channel": "Lovella Drama", "lang": "英文", "pubDate": "2026/9/11", "likes": 0, "comments": 96},
  "AzUNwzji3ls": {"channel": "SwoonRush Drama", "lang": "英文", "pubDate": "2026/9/28", "likes": 3112, "comments": 105},
  "ogMDDs8O6wU": {"channel": "Drama Express", "lang": "英文", "pubDate": "2026/7/6", "likes": 2007, "comments": 59},
  "Ug1rJ-c_dos": {"channel": "風月短劇社", "lang": "中文", "pubDate": "2026/9/2", "likes": 2976, "comments": 65},
  "Jy0sryYxxrw": {"channel": "Starry Drama Box", "lang": "英文", "pubDate": "2026/8/21", "likes": 3505, "comments": 177},
  "7-65B1XRO-Q": {"channel": "DramaLure", "lang": "英文", "pubDate": "2026/10/6", "likes": 2258, "comments": 102}
};

function attachMeta(dramas) {
  dramas.forEach(function (d) {
    var m = DRAMA_META[d.vid];
    if (!m) return;
    d.channel = m.channel || '';
    d.lang = m.lang || '英文';
    d.pubDate = m.pubDate || '';
    var mm = (m.pubDate || '').match(/(\d{4})[\/\-](\d{1,2})/);
    d.pubMonth = mm ? (mm[1] + '-' + ('0' + mm[2]).slice(-2)) : null;
    d.likes = (m.likes === null || m.likes === undefined) ? null : m.likes;
    d.comments = (m.comments === null || m.comments === undefined) ? null : m.comments;
  });
}
