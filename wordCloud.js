'use strict';

const Canvas    = require('canvas');
const d3cloud   = require('d3-cloud');
const d3        = require('d3');
const {JSDOM}   = require('jsdom');
let   doc       = new JSDOM ( // DOM生成
  `<!DOCTYPE html>
    <head>
    </head>
    <body>
      <svg width="1000" height="1000" viewbox="0 0 1000 1000">
        <g transform="translate(500,500)">
        </g>
      </svg>
    </body>`,
  {
    contentType: "text/html",
    includeNodeLocations: true
  },
  { features: {
      QuerySelector: true
    }
  }
).window.document;

class wordCloud {
  constructor() {}

  async getSvg(words) {
    let startDraw = function(func1, func2) { 
      d3cloud()
      .canvas(() => { return new Canvas.createCanvas(1000, 1000) })
      .size([1000, 1000])
      .words(func1)              // words配列を_drawに渡す
      .font("Kazesawa-Regular")                  // フォントを設定
      .fontSize((d) => { return d.size })        // フォントサイズを設定
      .rotate(() => { return 0 })                // 回転なしを設定
      .padding(4)                                // ワードクラウド文字間隔を拡大(defaultは1)
      .on("end", func2) // layoutが全ての単語の配置を完了したら、_draw関数を実行する
      .start();                                  // _draw関数の実行
    }

    await startDraw(this._getWords(words), this._draw);
    return doc.body.innerHTML;
  }

  _draw(words) {
    let cloud = d3.select(doc).select('svg').select('g').selectAll('text').data(words); // wordsオブジェクトが渡され、単語に対応するデータが更新される
    
    cloud.enter()          
      .append('text')                                      // 新しい単語のtext要素を作成&選択
      .attr("text-anchor", "middle")                       // 文字位置の指定
    .merge(cloud)     // merge(): 新しいtext要素に加えて既存のtext要素も含めて扱う
      //.transition().duration(600)
      .style('paint-order', 'stroke')
      .style('fill', (d) => { return d.color })            // 新しい単語を球団カラーで塗りつぶす
      .style('stroke-width', (d) => { if ((d.team=="tigers")||(d.team=="lions")) return d.size/12+'px' }) // 阪神or西武の場合、文字色だけだとみづらいので黒で縁取り(フチのサイズ)
      .style('stroke',       (d) => { if ((d.team=="tigers")||(d.team=="lions")) return "#000" })         // 同上(フチの色)
      .text((d) => { return d.text; })                     // 単語全てにテキスト設定
      .style("font-family", "Kazesawa-Regular")            // フォントを設定
      .style("font-size", (d) => { return d.size + "px" }) // 単語全てにサイズ設定
      .attr("transform", (d) => {                          // 単語全てに位置を指定
         return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")" 
      });
  }

  // 集計データをd3.cloudで読み取り可能なオブジェクトに変換する関数
  _getWords(data) {
    var countMax   = d3.max(data, (d) => {return d.count});
    var countMin   = d3.min(data, (d) => {return d.count});
    var sizeScale  = d3.scaleLog().domain([countMin, countMax]).range([10, 60]); //ログスケール
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
        size:  sizeScale(d.count),
        color: colorScale(d.team),
        team:  d.team
      }
    })
  }
}

module.exports.wordCloud = wordCloud;