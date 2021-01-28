'use strict';

const {createCanvas} = require('canvas');
const d3cloud   = require('d3-cloud');
const d3        = require('d3');
const {JSDOM}   = require('jsdom');

const WIDTH  = 2000;
const HEIGHT = 2000;

let   document = new JSDOM ( // DOM生成
  `<body></body>`,
  {
    contentType: "text/html",
    includeNodeLocations: true
  },
  { features: {
      QuerySelector: true
    }
  }
).window.document;

module.exports.getWordCloud = async function getWordCloud(words) {
  // 解析処理
  const wordsForCloud = await new Promise(resolve => {
    d3cloud()
    .canvas(() => createCanvas(WIDTH, HEIGHT) ) // new Canvas.createCanvasだとエラー！
    .size([WIDTH, HEIGHT])
    .words(_getWords(words))                    // wordsオブジェクトを解析
    .font("Kazesawa-Regular")                   // フォントを設定
    .fontSize((d) => { return d.size })         // 解析結果に従いフォントサイズを設定
    .rotate(() => { return 0 })                 // 回転なしを設定
    .padding(4)                                 // ワードクラウド文字間隔を拡大(defaultは1)
    .on("end", (words) => resolve(words))       // layoutが全ての単語の配置を完了するまで待ち、d3の描画に引き継ぐ
    .start();
  });
  
  // 描画処理
  d3.select(document.body)
  .append('svg')
    //.attr('class', 'ui fluid image')
    .attr('viewBox', `0 0 `+WIDTH+` `+HEIGHT)
    .attr('width', '100%')
    .attr('height', '100%')
  .append('g')
    .attr('transform', `translate(`+WIDTH/2+`,`+HEIGHT/2+`)`)
  .selectAll('text')
    .data(wordsForCloud)
  .enter().append('text')
    .style('paint-order', 'stroke')
    .style('fill', (d) => { return d.color })            // 新しい単語を球団カラーで塗りつぶす
    .text((d) => { return d.text; })                     // 単語全てにテキスト設定
    .style("font-family", "Kazesawa-Regular")            // フォントを設定
    .style("font-size", (d) => { return d.size + "px" }) // 単語全てにサイズ設定
    .attr("transform", (d) => {                          // 単語全てに位置を指定
       return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")" 
    })
    .attr('text-anchor', 'middle');
  
  return document.body.innerHTML;
};

function _getWords(data) {
  var arr_count  = data.map(d => d.count);
  //var countMax   = d3.max(arr_count);
  //var countMin   = d3.min(arr_count);
  var countMax   = Math.max.apply(null, arr_count); // d3.maxの挙動がおかしいので
  var countMin   = Math.min.apply(null, arr_count); // d3.minの挙動がry
  var sizeScale  = d3.scaleLog().domain([countMin, countMax]).range([10, countMax/30]); //ログスケール
  var colorScale = function(t){
    switch(t) {
      case "baystars":  return d3.color("dodgerblue");
      case "giants":    return d3.color("orange");
      case "tigers":    return d3.color("yellow");
      case "swallows":  return d3.color("limegreen");
      case "dragons":   return d3.color("darkblue");
      case "carp":      return d3.color("red");
      case "hawks":     return d3.color("gold");
      case "lions":     return d3.color("aqua");
      case "buffaloes": return d3.color("darkgoldenrod");
      case "eagles":    return d3.color("firebrick");
      case "fighters":  return d3.color("steelblue");
      case "marines":   return d3.color("black");
      default:          return d3.color("gray");
    }
  };
  return data.map( function(d) {
    return {
      text:  d.word, 
      size:  (sizeScale(d.count)>=0)?sizeScale(d.count):0, // Pango-CRITICAL **: assertion 'size >= 0' failed 対策
      color: colorScale(d.team),
      team:  d.team
    }
  })
};