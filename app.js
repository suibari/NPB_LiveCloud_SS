'use strict';

const twit    = require('twit')({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
const svg2       = require('oslllo-svg2');
const SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler('crash.log')
require('date-utils');
const redis_wrap = require('./redis_wrap.js')
const request    = require('request');

const WORDS_LENGTH = 300;
const TOP_WORDS_LENGTH = 50;

// ある時間にcron_botでWC生成＆ツイート
//cron.schedule('*/30 * * * * *', () => { // 10秒おきに実行
//cron.schedule('0 0 9,18,23 * * *', () => { // 9時、18時、23時に実行

// SVG取得
console.log("YUKI.N > =====================================")
console.log("YUKI.N > 1. connecting redis...");
require('./redis_wrap.js').getCount("all", WORDS_LENGTH).then((words) => { 
  console.log("YUKI.N >    successful to get record from redis...");
  console.log("            maximum word size: " + words[0].count);
  const min_word_size = (words.length >= WORDS_LENGTH)? words[WORDS_LENGTH-1].count : words.length-1;
  console.log("            minimum word size: " + min_word_size);
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
        const idx_first  = 0;
        const idx_second = words.findIndex(word => (word.team != words[idx_first].team) && (word.word != words[idx_first].word));
        const idx_third  = words.findIndex(word => (word.team != words[idx_first].team) && (word.word != words[idx_first].word) && (word.team != words[idx_second].team) && (word.word != words[idx_second].word));
        const now = new Date();
        redis_wrap.getTimeStamp().then((date_from_lastpost) => {
          const hour_from_lastpost = Math.floor((now - new Date(date_from_lastpost)) / (1000 * 60 * 60 )); // 現在時刻と最終投稿日の差をミリ秒で割ることで、最終投稿から何時間たったか を取得
          var text = "suibariさんちのラズパイです🥺("+now.toFormat('YYYY/M/D HH24時MI分')+") \n"+
                     "ここ"+hour_from_lastpost+"時間の球界の話題は、"+
                     "#" + words[idx_first].team  + " の「" + words[idx_first].word  + "」で"+words[idx_first].count+"回つぶやかれました。"+
                     "ほか #" + words[idx_second].team + " の「" + words[idx_second].word + "」、"+
                     "#" + words[idx_third].team  + " の「" + words[idx_third].word  + "」などが人気でした。#npb\n";
          text += "URL: https://npb-livecloud.herokuapp.com/\n";
          console.log(text);
          var params = { status: text, media_ids: [data.media_id_string] }

          twit.post('statuses/update', params, function (err, data, response) {
            if (!err) {
              console.log("YUKI.N >    successsful to post to Twitter.");
              redis_wrap.initAndSetTimeStamp();
              console.log("YUKI.N > =====================================");
              
              // 上位30個のワードを順番に
              for (let i=0; i<TOP_WORDS_LENGTH; i++) {
                // APIをたたく
                request.get({
                  uri: "https://npb-meikan.herokuapp.com/json?name=",
                  headers: {'Content-type': 'application/json'},
                  qs: {name: words[i].word},
                  json: true
                }, (err, response, body) => {
                  if (response.statusCode == 200) {
                    //ツイート文生成
                    const stats_thisyear     = body.stats_2020;
                    const txt_stats_thisyear = (stats_thisyear) ? 
                                               ((body.position == "投手") ?
                                                 ("試" + stats_thisyear.game + "/勝" + stats_thisyear.win + "/敗" + stats_thisyear.lose + "/S" + stats_thisyear.save +
                                                 "/回" + stats_thisyear.inning + "/防" + stats_thisyear.era + "/WHIP:" + stats_thisyear.whip) :
                                                 ("試" + stats_thisyear.game + "/打" + stats_thisyear.ab + "/安" + stats_thisyear.h + "/率" + stats_thisyear.avg + "/出" + stats_thisyear.obp + 
                                                 "/本" + stats_thisyear.hr + "/点" + stats_thisyear.rbi + "/盗" + stats_thisyear.sb + "/OPS:" + stats_thisyear.ops)) :
                                               ("今シーズン未出場");  
                    const txt_player = "トレンドの選手情報です。\n\n"+
                                        body.name + "(" + body.kana + ")\n"+
                                        body.team + "\n"+
                                        body.career + (body.draft_y ? (" (" + body.draft_y + ")") : "") + "\n"+
                                        body.birthday + "生まれ (" + body.age + "歳)\n"+
                                        "今年度成績: "+ txt_stats_thisyear + "\n"+
                                        body.url + "\n\n" +
                                        "@" + data.user.screen_name;
                    console.log(txt_player);
                    twit.post('statuses/update', {status: txt_player, in_reply_to_status_id: data.id_str});
                  };
                }) 
              }
              //process.exit(1);
            } else {
              console.error(err);
            }
          });
        })
      });
    }).catch(err => { // svg変換失敗したらthrow
      throw err;
    });
  });
}).catch(err => { // redisアクセス失敗したらthrow
  throw err;
});
//});