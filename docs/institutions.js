(() => {
  const root=document.getElementById('institution-cards'),state=document.getElementById('institution-status');
  let records=[];
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const tonnes=n=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1}).format(n)+' t';
  const signed=n=>(n>0?'+':'')+tonnes(n);
  function link(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener';return a;}
  function render(){
    root.replaceChildren();const filter=document.getElementById('institution-filter').value;
    for(const r of records.filter(r=>filter==='all'||r.type===filter)){
      const card=el('article',undefined,'institution-card');
      card.append(el('p',r.country+' / '+(r.type==='central'?'中央銀行':'政府系ファンド'),'institution-country'),el('h3',r.name),el('p',r.english,'institution-english'));
      const text=r.changeTonnes===null?tonnes(r.holdingsTonnes):signed(r.changeTonnes);
      card.append(el('strong',text,'institution-value '+(r.changeTonnes===null?'':r.changeTonnes<0?'down':'up')),el('p',r.changeTonnes===null?'公表保有量 · 増減は未掲載':r.changeTonnes<0?'金準備の減少':'金準備の増加','institution-kind'),el('p','対象：'+r.period,'institution-period'));
      if(r.changeTonnes!==null){const track=el('div',undefined,'institution-track');const bar=el('span',undefined,r.changeTonnes<0?'negative':'');bar.style.width=(Math.abs(r.changeTonnes)/63*100)+'%';track.append(bar);card.append(track);}
      const details=el('details');details.append(el('summary','根拠・確認できる範囲'),el('p',r.note),el('p','資料公表日：'+(r.publishedOn||'ページに記載なし')),link(r.source,r.url));
      if(r.latest){const l=r.latest;const box=el('div',undefined,'institution-latest');box.append(el('h4','追加公表：'+l.period),el('p','前月比 '+signed(l.changeTonnes)+' ／ 保有 '+tonnes(l.holdingsTonnes)),el('p',l.note),link(l.source,l.url));details.append(box);}
      card.append(details,link('出典を開く',r.url));root.append(card);
    }
  }
  fetch('data/institutions.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(data=>{
    if(!Array.isArray(data.records)||!data.records.length)throw Error('Invalid institutions');
    records=data.records;state.textContent='資料確認日 '+data.verifiedOn+' ｜ '+data.updateMode;
    document.getElementById('institution-filter').addEventListener('change',render);render();
  }).catch(()=>{state.textContent='機関別資料を取得できませんでした。接続を確認して再読込してください。';});
})();
