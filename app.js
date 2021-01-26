'use strict';

const twit    = require('twit')({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
const svg2      = require('oslllo-svg2');
const SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler('crash.log')
require('date-utils');

const WORDS_LENGTH = 200;

// ある時間にcron_botでWC生成＆ツイート
//cron.schedule('*/30 * * * * *', () => { // 10秒おきに実行
//cron.schedule('0 0 9,18,23 * * *', () => { // 9時、18時、23時に実行

// SVG取得
console.log("YUKI.N > =====================================")
console.log("YUKI.N > 1. connecting redis...");
require('./redis_wrap.js').getCount("all", WORDS_LENGTH).then((words) => { 
  console.log("YUKI.N >    successful to get record from redis...");
  console.log("            maximum word size: " + words[0].count);
  console.log("            minimum word size: " + words[WORDS_LENGTH-1].count);
  console.log(words);

  console.log("YUKI.N > -------------------------------------");
  console.log("YUKI.N > 2. generating wordcloud from record...");
  require('./wordCloud.js').getWordCloud(words).then((svg) => {
    console.log(svg);
    console.log("YUKI.N >    successful to generate wordcloud(SVG).");
    
    // svg -> base64変換
    console.log("YUKI.N > -------------------------------------");
    console.log("YUKI.N > 3. converting svg to base64...");
    svg2(svg).toUri({ base64: true, mime: svg2.PNG }).then((uri) => {
      console.log("YUKI.N >    successful conversion.");

      // twitter投稿
      // 1. 画像アップロード(base64)
      console.log("YUKI.N > -------------------------------------");
      console.log("YUKI.N > 4. attempt to post to Twitter.");
      twit.post('media/upload', { media_data: uri }, function (err, data, response) {
        
        // 2. 画像付きツイート
        const now = new Date();
        var text = "suibariさんちのラズパイです🥺("+now.toFormat('YYYY/M/D HH24時MI分')+")\n"+
                   "ここ6時間の球界の話題は、"+
                   "#" + words[0].team + " の「" + words[0].word + "」、"+
                   "#" + words[1].team + " の「" + words[1].word + "」、"+
                   "#" + words[2].team + " の「" + words[2].word + "」などでした。\n";
        text += "URL: https://npb-livecloud.herokuapp.com/";
        console.log(text);
        var params = { status: text, media_ids: [data.media_id_string] }

        twit.post('statuses/update', params, function (err, data, response) {
          if (!err) {
            console.log("YUKI.N >    successsful to post to Twitter.");
            console.log("YUKI.N > =====================================");
            process.exit(1);
          } else {
            console.error(err);
          }
        });
      });
    }).catch(err => { // svg変換失敗したらthrow
      throw err;
    });
  });
}).catch(err => { // redisアクセス失敗したらthrow
  throw err;
});
//});