(() => {
  const endpoint='https://api.gold-api.com/price/XAU';
  let busy=false;
  const currencies=['USD','JPY'];
  const $=id=>document.getElementById(id);
  const stored={};
  function valid(data,currency){
    return data?.symbol==='XAU'&&data.currency===currency&&Number.isFinite(data.price)&&data.price>0&&Number.isFinite(Date.parse(data.updatedAt))&&Date.parse(data.updatedAt)<=Date.now()+300000;
  }
  function render(currency,data,cached=false){
    const price=currency==='JPY'?data.price/31.1034768:data.price;
    $('price-'+currency).textContent=new Intl.NumberFormat('ja-JP',{style:'currency',currency,minimumFractionDigits:currency==='USD'?2:0,maximumFractionDigits:currency==='USD'?2:0}).format(price);
    const old=Date.now()-Date.parse(data.updatedAt)>10*60*1000;
    const time=new Date(data.updatedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'});
    $('time-'+currency).textContent=(cached?'保存済み価格 ｜ ':'価格更新 ')+time+' JST'+(old?' ｜ 10分以上経過':'');
    $('time-'+currency).classList.toggle('price-stale',cached||old);
    stored[currency]=data;
  }
  for(const currency of currencies){try{const data=JSON.parse(localStorage.getItem('gold-price-'+currency));if(valid(data,currency))render(currency,data,true);}catch{}}
  async function update(){
    if(busy)return;busy=true;$('price-refresh').disabled=true;
    const results=await Promise.allSettled(currencies.map(async currency=>{
      const url=endpoint+(currency==='JPY'?'/JPY':'');
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Price HTTP '+response.status);
      const data=await response.json();if(!valid(data,currency))throw Error('Invalid '+currency+' quote');
      render(currency,data);try{localStorage.setItem('gold-price-'+currency,JSON.stringify(data));}catch{}
    }));
    let failures=0;results.forEach((result,i)=>{if(result.status==='rejected'){failures++;const currency=currencies[i];if(stored[currency])render(currency,stored[currency],true);else{$('price-'+currency).textContent='取得できません';$('time-'+currency).textContent='接続を確認して価格を更新してください。';}}});
    $('price-status').textContent=failures?'価格の取得に失敗しました。表示日時を確認してください。':'表示中は60秒ごとに価格を取得します。';
    $('price-refresh').disabled=false;busy=false;
  }
  $('price-refresh').addEventListener('click',update);
  window.addEventListener('online',update);
  window.addEventListener('offline',()=>{for(const currency of currencies)if(stored[currency])render(currency,stored[currency],true);$('price-status').textContent='オフライン：保存済みの価格です。';});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  setInterval(()=>{if(!document.hidden)update();},60000);
  update();
})();
