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

// twitterストリーミングエンドポイントとの接続
const stream = twit.stream('statuses/filter',
  {
    track: convertAry( require('./src/query.json') ), 
    language: "ja"
  }
);

// ツイートがあるたびにanalysis.jsを呼び出す
stream.on('tweet', (tweet) => {
  console.log(tweet.user.name + "> " + tweet.text);
  // analysis.jsにtweet.textを渡す
  require('./analysis.js')(tweet.text);
});

// wordCloud描画インスタンス作成
const cloud = new wordcloud.wordCloud();

// ある時間にcron_botでWC生成＆ツイート
//cron.schedule('*/10 * * * * *', () => { // 10秒おきに実行
cron.schedule('0 0 9,18,23 * * *', () => { // 9時、18時、23時に実行

  // SVG取得
  cloud.getSvg(require('./storing.js').getCount("all")).then((svg) => {
    console.log("YUKI.N > successful get SVG.");
    
    // svg -> base64変換
    svg2(svg).toUri({ base64: true, mime: svg2.PNG }).then((uri) => {
    //svg2(svg).jpeg().toFile("./test.jpeg").then((uri) => {
      //console.log(uri); // iVBORw0KGgoAAAANSUhEUgAAADAAAAA...
      console.log("YUKI.N > -----------------------------------------")
      console.log("YUKI.N > successful svg2base64 conversion.");
      console.log("YUKI.N > -----------------------------------------")
      // twitter投稿
      // 1. 画像アップロード(base64)
      twit.post('media/upload', { media_data: uri }, function (err, data, response) {
        
        // 2. 画像付きツイート
        let text = "NPBライブクラウドbotがお知らせします。\n" +
                   "各球団で盛り上がっているワードは以下です。\n";
        teams.forEach((team) => {
          let count = require('./storing.js').getCount(team);
          if (count.length > 0) {
            text += "#" + team + " :" + count[count.length - 1].word + "\n";
          }
        });
        text += "\n"+
                "URL: https://npb-livecloud.herokuapp.com/";
        console.log(text);
        var params = { status: text, media_ids: [data.media_id_string] }
        twit.post('statuses/update', params, function (err, data, response) {
          if (!err) {
            console.log("YUKI.N > =====================================")
            console.log("YUKI.N > successsful post to Twitter.")
            console.log("YUKI.N > =====================================")
          } else {
            console.error(response)
          }
        });
      });
    })
    .catch((err) => { // svg変換失敗したらthrow
        throw err;
    });

  });
})

// JSONから配列にパースする関数
function convertAry(json) {
  var q = [];
  for (let key in json) {
    for (let i = 0; i < json[key].length; i++) {
      q.push(json[key][i]);
    }
  }
  return q;
};