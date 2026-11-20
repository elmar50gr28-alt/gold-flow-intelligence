(() => {
 const A=window.GoldAnalytics,$=id=>document.getElementById(id),fmt=(n,d=1)=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n),signed=(n,d=1)=>(n>0?'+':'')+fmt(n,d);
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const tone=n=>n<0?'down':n>0?'up':'';
 let market,cot;
 function source(s){const a=make('a','出典');a.href=s.sourcePage;a.target='_blank';a.rel='noopener';return a;}
 function status(s){if(!s.points?.length)return 'データ未取得';const date=s.points.at(-1).date;let label='基準日 '+date;if(s.status!=='ok')label+=' ｜ 自動取得失敗・前回値を表示'+(s.verifiedOn?'（確認 '+s.verifiedOn+'）':'');else label+=' ｜ 取得 '+new Date(s.fetchedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+' JST';return label;}
 function spark(target,points,unit){
  const host=$(target);host.replaceChildren();if(points.length<2){host.append(make('p','履歴が不足しています。','muted'));return;}
  const width=Math.max(280,host.clientWidth),height=210,pad={l:62,r:14,t:18,b:26};let min=Math.min(...points.map(r=>r.value)),max=Math.max(...points.map(r=>r.value));if(max===min){min-=1;max+=1;}const margin=(max-min)*.12;min-=margin;max+=margin;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const y=v=>pad.t+(max-v)/(max-min)*(height-pad.t-pad.b),x=i=>pad.l+i/(points.length-1)*(width-pad.l-pad.r);
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;svg.append(e);return e;};
  for(let i=0;i<4;i++){const value=min+(max-min)*i/3;add('line',{x1:pad.l,x2:width-pad.r,y1:y(value),y2:y(value),stroke:'#33433b'});add('text',{x:pad.l-8,y:y(value)+5,'text-anchor':'end',fill:'#a9b7ad','font-size':13},fmt(value,0));}
  add('polyline',{points:points.map((r,i)=>`${x(i)},${y(r.value)}`).join(' '),fill:'none',stroke:'#dfc380','stroke-width':2.5});
  const title=document.createElementNS(ns,'title');title.textContent=points[0].date+'から'+points.at(-1).date+'。最新 '+fmt(points.at(-1).value,2)+' '+unit;svg.prepend(title);svg.setAttribute('role','img');svg.setAttribute('aria-label',title.textContent);host.append(svg);
  host.append(make('p',points[0].date+' — '+points.at(-1).date+' / '+unit,'muted'));
 }
 function valueCard(title,value,unit,detail,cls=''){const card=make('article',undefined,'insight-card');card.append(make('h3',title),make('strong',value,cls),make('p',unit,'insight-unit'),make('p',detail,'muted'));return card;}
 function renderMarket(){
  const data=market.series;
  const future=data.futures;const price=$('future-stats');price.replaceChildren();
  if(future?.points?.length){for(const [steps,label] of [[1,'前取引日比'],[5,'5取引日前比'],[21,'21取引日前比']]){const c=A.change(future.points,steps);price.append(valueCard(label,c?signed(c.percent,2)+'%':'履歴不足','COMEX金先物・終値',c?c.baseDate+' → '+c.date:'必要な日数が揃っていません',c?tone(c.percent):''));}$('future-status').textContent=status(future);$('future-source').replaceChildren(source(future));spark('future-chart',future.points.slice(-63),'USD / oz');}
  else $('future-status').textContent='金先物の履歴を取得できませんでした。';
  const etfs=$('etf-stats');etfs.replaceChildren();
  for(const key of ['gld','gldm']){const s=data[key];if(!s?.points?.length){etfs.append(valueCard(key.toUpperCase(),'未取得','',s?status(s):'公式データを取得できません'));continue;}
   const latest=s.points.at(-1),card=valueCard(s.name,fmt(latest.value,2)+' t','信託の金保有量',status(s));
   const list=make('dl',undefined,'mini-changes');for(const [steps,label] of [[1,'前取引日比'],[5,'5取引日前比'],[21,'21取引日前比']]){const c=A.change(s.points,steps);list.append(make('dt',label),make('dd',c?signed(c.value,2)+' t':'履歴不足',c?tone(c.value):''));}card.append(list,make('p','増減は金保有数量の変化。売買注文や運営会社自身の購入ではありません。','muted'),source(s));etfs.append(card);
  }
  const macro=$('macro-stats');macro.replaceChildren();for(const key of ['DEXJPUS','DTWEXBGS','DFII10']){const s=data[key];if(!s?.points?.length){macro.append(valueCard(key,'未取得','','取得できません'));continue;}const c=A.change(s.points,1),detail=c?'前回公表値比 '+signed(c.value,key==='DFII10'?2:3)+(key==='DFII10'?' ％ポイント':'')+' / 比較日 '+c.baseDate:'比較値なし';const card=valueCard(s.name,fmt(s.points.at(-1).value,key==='DTWEXBGS'?3:2),s.unit,detail);card.append(make('p',status(s),'muted'),source(s));macro.append(card);}
  const china=data.china,block=$('china-summary');block.replaceChildren();if(china?.points?.length){const result=A.annual(china.points);block.append(valueCard('中国人民銀行・直近12か月',result?signed(result.value,1)+' t':'履歴不足','金準備の純増減',result?result.baseDate.slice(0,7)+'末 → '+result.date.slice(0,7)+'末':'連続13か月の観測が必要です'));$('china-status').textContent=status(china)+' ｜ 月次・対象月末の数量';spark('china-chart',china.points,'t');const body=$('china-history');body.replaceChildren();if(result)for(const m of result.months){const tr=make('tr');tr.append(make('td',m.date.slice(0,7)),make('td',signed(m.value,1)+' t',tone(m.value)));body.append(tr);}$('china-source').replaceChildren(...(china.sources||[china.sourcePage]).map((url,i)=>{const a=make('a','SAFE資料 '+(i+1));a.href=url;a.target='_blank';a.rel='noopener';return a;}));}else $('china-status').textContent='中国の月次履歴を取得できませんでした。';
 }
 function renderPosition(){const weeks=Number($('position-window').value),result=A.positioning(cot.records,weeks);if(!result){$('position-status').textContent='比較履歴が不足しています。';return;}
  $('position-status').textContent=result.baseDate+' → '+result.date+' / 対象：運用会社（Managed Money）';const cards=$('position-stats');cards.replaceChildren();
  cards.append(valueCard('ロング建玉の増減',signed(result.longChange,0)+' 枚',result.longChange>=0?'買い持ち増加':'買い持ち減少','差引残高の変化であり、新規注文の総量ではありません。',tone(result.longChange)),valueCard('ショート建玉の増減',signed(result.shortChange,0)+' 枚',result.shortChange<=0?'売り持ち減少（買戻し方向）':'売り持ち増加','売り持ちが減ると、ネット買い越しを押し上げます。',tone(-result.shortChange)),valueCard('ネットポジションの増減',signed(result.netChange,0)+' 枚','ロング変化 − ショート変化','金額ベースの資金流入・流出ではありません。',tone(result.netChange)));
  $('position-index').textContent=fmt(result.index,1)+' / 100';$('position-meter').value=result.index;$('position-range').textContent='過去'+result.weeks+'週のネット最小 '+signed(result.min,0)+'枚 ／ 最大 '+signed(result.max,0)+'枚';
 }
 async function init(){
  const results=await Promise.allSettled([fetch('data/market.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}),fetch('data/cftc.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();})]);
  if(results[0].status==='fulfilled'){market=results[0].value;renderMarket();}else $('future-status').textContent='追加指標を取得できません。接続を確認してください。';
  if(results[1].status==='fulfilled'){cot=results[1].value;renderPosition();$('position-window').addEventListener('change',renderPosition);}else $('position-status').textContent='CFTC統計を取得できません。';
 }
 window.addEventListener('resize',()=>{if(market)renderMarket();});init();
})();
