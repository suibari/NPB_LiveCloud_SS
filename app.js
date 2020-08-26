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
cron.schedule('*/10 * * * * *', () => { // 10秒おきに実行

  // SVG取得
  cloud.getSvg(require('./storing.js').getCount("all")).then((svg) => {
    console.log("YUKI.N > successful get SVG.");
    console.log(svg);
    
    // svg -> base64変換
    svg2(svg).toUri({ base64: true, mime: svg2.PNG }).then((uri) => {
      //console.log(uri); // iVBORw0KGgoAAAANSUhEUgAAADAAAAA...
      console.log("YUKI.N > successful svg2base64 conversion.");

      // twitter投稿
      // 1. 画像アップロード(base64)
      twit.post('media/upload', { media_data: uri }, function (err, data, response) {

        // 2. 画像メタデータ設定
        var mediaIdStr = data.media_id_string
        var altText = "wordcloud by suibari"
        var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }
        twit.post('media/metadata/create', meta_params, function (err, data, response) {
          if (!err) {

            // 3. 画像付きツイート
            var params = { status: 'test', media_ids: [mediaIdStr] }
            twit.post('statuses/update', params, function (err, data, response) {
              if (!err) {
                console.log("YUKI.N > =====================================")
                console.log("YUKI.N > successsful post to Twitter.")
                console.log("YUKI.N > =====================================")
              } else {
                console.error(response)
              }
            });
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