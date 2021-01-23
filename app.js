'use strict';

const twit    = require('twit')({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
const svg2      = require('oslllo-svg2');
const cron      = require('node-cron');
const wordcloud = require('./wordCloud.js');
const teams = [
  "baystars", "giants", "tigers", "swallows", "dragons", "carp", 
  "hawks", "lions", "buffaloes", "eagles", "fighters", "marines"
];

// wordCloud描画インスタンス作成
const cloud = new wordcloud.wordCloud();

// ある時間にcron_botでWC生成＆ツイート
//cron.schedule('*/30 * * * * *', () => { // 10秒おきに実行
//cron.schedule('0 0 9,18,23 * * *', () => { // 9時、18時、23時に実行

  // SVG取得
  require('./redis_wrap.js').getCount("all", 200).then((words) => { 
    console.log("YUKI.N > -----------------------------------------");
    console.log("YUKI.N > 1. successful get " + words.length + " record from redis.");

    //console.log(words)
    cloud.getSvg(words).then((svg) => {
      console.log("YUKI.N > 2. successful get SVG.");
      
      // svg -> base64変換
      svg2(svg).toUri({ base64: true, mime: svg2.PNG }).then((uri) => {
      //svg2(svg).jpeg().toFile("./test.jpeg").then((uri) => {
        //console.log(uri); // iVBORw0KGgoAAAANSUhEUgAAADAAAAA...
        console.log("YUKI.N > 3. successful svg -> base64 conversion.");
  
        // twitter投稿
        // 1. 画像アップロード(base64)
        twit.post('media/upload', { media_data: uri }, function (err, data, response) {
          
          // 2. 画像付きツイート
          var text = "現在の球界の話題はこんな感じです。\n";
          //teams.forEach( async (team) => {
          //  await require('./redis_wrap.js').getCount(team, 1).then((count_team) => {
          //    text += "#" + team + " :" + count_team[0].word + "\n";
          //  });
          //});
          text += "URL: https://npb-livecloud.herokuapp.com/";
          console.log(text);
          var params = { status: text, media_ids: [data.media_id_string] }
  
          twit.post('statuses/update', params, function (err, data, response) {
            if (!err) {
              console.log("YUKI.N > 4.successsful post to Twitter.")
              console.log("YUKI.N > =====================================")
  
            } else {
              console.error(err)
            }
          });
        });
      })
      .catch(err => { // svg変換失敗したらthrow
          throw err;
      });
    });
  })
  .catch(err => { // redisアクセス失敗したらthrow
    throw err;
  });
//});

const SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler('crash.log')