'use strict';

// redisインスタンス生成&接続
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

module.exports.getCount = async function (team, num) {
  let arr_count_all  = [];
  let arr_count_team = [];

  if (team == "all") {
    // ----全チーム選択時----
    // zrevrangebyscoreを取って、JSON.parseしてオブジェクトに変換する
    (await redis.zrevrangebyscore("count_all", "+inf", 1, "WITHSCORES", "LIMIT", 0, num, (err, res) => {
      // redisのresultをwordcloud作りやすいフォーマットに変換
      arr_count_all = convertRedisArr(res);
      // arr_count_all.wordに対してJSON.parseした[0]をwordに再代入し、[1]をteamプロパティに入れる
      arr_count_all.forEach((count_all) => {
        const arr_wt = JSON.parse(count_all.word);
        count_all.word = arr_wt[0];
        count_all.team = arr_wt[1];
      });
    }));
    return arr_count_all;

  } else {
    // ----単体チーム選択時----
    // zrevrangebyscoreを取って、オブジェクトに変換する
    (await redis.zrevrangebyscore("count_"+team, "+inf", 1, "WITHSCORES", "LIMIT", 0, num, (err, res) => {
      // redisのresultをwordcloud作りやすいフォーマットに変換
      arr_count_team = convertRedisArr(res);
      // チーム名を全要素にセット
      arr_count_team.forEach((obj) => {
        obj.team = team;
      });
    }));
    return arr_count_team;
  }
};

module.exports.getTPS = function () {
  redis.get("tps", (err, res) => {
    if (!err) {
      return JSON.parse(res);
    } else {
      console.log(err);
    }
  })
};

module.exports.initAndSetTimeStamp = function () {
  redis.pipeline()
    .flushall()
    .set("last_changed_date", new Date())
    .exec((err, res) => {console.log(res)})
  console.log("YUKI.N > successful to reflesh redis, and set timestamp.");
}

module.exports.getTimeStamp = async function () {
  return redis.get("last_changed_date");
}

// redisのresultを変換する関数
function convertRedisArr (arr) {   // ex.) [0, 1, 2, 3, ...]
  let res  = [];
  let even = [];
  let odd  = [];

  even = arr.filter((value, index) => {
    return index % 2 === 0; // [0, 2, 4, ...]
  });
  odd = arr.filter((value, index) => {
    return index % 2 === 1; // [1, 3, 5, ...]
  });

  for (let i=0; i<even.length; i++) {
    res.push(
      { 
        word:  even[i],
        count: odd[i]
      }
    );
  }

  return res;
}