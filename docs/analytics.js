(function(scope){
 'use strict';
 function change(points,steps){if(points.length<=steps)return null;const latest=points.at(-1),base=points.at(-1-steps);if(!Number.isFinite(base.value)||base.value===0)return null;return {value:latest.value-base.value,percent:(latest.value/base.value-1)*100,baseDate:base.date,date:latest.date};}
 function positioning(records,weeks){
  if(records.length<=weeks)return null;
  const current=records.at(-1),base=records.at(-1-weeks),values=records.slice(-156).map(r=>r.managed.net),min=Math.min(...values),max=Math.max(...values);
  return {longChange:current.managed.long-base.managed.long,shortChange:current.managed.short-base.managed.short,netChange:current.managed.net-base.managed.net,min,max,index:max===min?50:(current.managed.net-min)/(max-min)*100,date:current.date,baseDate:base.date,weeks:values.length};
 }
 function annual(points){if(points.length<13)return null;const rows=points.slice(-13);for(let i=1;i<rows.length;i++){const a=rows[i-1].date.slice(0,7).split('-').map(Number),b=rows[i].date.slice(0,7).split('-').map(Number);if(b[0]*12+b[1]-a[0]*12-a[1]!==1)return null;}return {value:rows.at(-1).value-rows[0].value,baseDate:rows[0].date,date:rows.at(-1).date,months:rows.slice(1).map((r,i)=>({date:r.date,value:r.value-rows[i].value}))};}
 const api={change,positioning,annual};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.GoldAnalytics=api;
})(typeof window==='undefined'?globalThis:window);
