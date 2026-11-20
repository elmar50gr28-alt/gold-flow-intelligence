"""Independent public data updates. Failed sources keep dated last-good values."""
import concurrent.futures, csv, datetime as dt, io, json, math, pathlib, re, urllib.request, xml.etree.ElementTree as ET, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/'docs/data/market.json'
UTC=dt.timezone.utc
def get(url):
    request=urllib.request.Request(url,headers={'User-Agent':'GoldFlowIntelligence/1.4 (public statistics)'})
    with urllib.request.urlopen(request,timeout=22) as r: return r.read()
def normalize(points, minimum=2):
    assert len(points)>=minimum,'Insufficient observations'
    points.sort(key=lambda p:p['date'])
    assert len({p['date'] for p in points})==len(points),'Duplicate dates'
    for p in points:
        assert dt.date.fromisoformat(p['date'])<=dt.datetime.now(UTC).date()
        assert math.isfinite(p['value'])
    return points
def futures():
    source='https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?range=6mo&interval=1d'
    result=json.loads(get(source))['chart']['result'][0]
    assert result['meta']['symbol']=='GC=F' and result['meta']['currency']=='USD'
    today=dt.datetime.now(UTC).date().isoformat()
    points=[]
    for timestamp,value in zip(result['timestamp'],result['indicators']['quote'][0]['close']):
        date=dt.datetime.fromtimestamp(timestamp,UTC).date().isoformat()
        if value is not None and date<today:
            assert 0<float(value)<100000
            points.append({'date':date,'value':float(value)})
    return {'name':'COMEX金先物（GC=F）','unit':'USD / oz','source':source,'sourcePage':'https://finance.yahoo.com/quote/GC=F/history/','points':normalize(points,30),'note':'期近連続の日足終値。限月切替の影響があります。当日足は除外。現物価格とは別系列。'}
def sheet_rows(blob):
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            shared=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
        for path in z.namelist():
            if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml',path):continue
            rows=[]
            for row in ET.fromstring(z.read(path)).findall('.//s:row',ns):
                cells={}
                for c in row.findall('s:c',ns):
                    v=c.find('s:v',ns); text=v.text if v is not None else ''.join(c.itertext())
                    cells[re.sub(r'\d','',c.get('r',''))]=shared[int(text)] if c.get('t')=='s' else text
                rows.append(cells)
            yield rows
def etf(product):
    source='https://api.spdrgoldshares.com/api/v1/historical-archive?exchange=NYSE&lang=en&product='+product
    points=[]
    for rows in sheet_rows(get(source)):
        date_col=tonnes_col=None
        for row in rows:
            for col,value in row.items():
                if value.strip()=='Date':date_col=col
                if value.strip()=='Tonnes of Gold':tonnes_col=col
            if not date_col or not tonnes_col:continue
            try:
                date=dt.datetime.strptime(row[date_col],'%d-%b-%Y').date().isoformat()
                value=float(row[tonnes_col].replace(',',''))
            except (KeyError,ValueError):continue
            assert 0<value<10000
            points.append({'date':date,'value':value})
    points=normalize(points,25)
    # Retain only recent factual holdings, not the issuer's archive or price history.
    return {'name':'SPDR Gold Trust (GLD)' if product=='gld' else 'SPDR Gold MiniShares (GLDM)','unit':'t','source':source,'sourcePage':'https://www.spdrgoldshares.com/usa/'+product+'/','points':points[-35:],'note':'信託が保有する金の数量。発行会社自身の投資判断や、ETF投資家の実名を示すものではありません。'}
def fred(series):
    source='https://fred.stlouisfed.org/graph/fredgraph.csv?id='+series+'&cosd='+str(dt.datetime.now(UTC).date()-dt.timedelta(days=420))
    rows=csv.reader(io.StringIO(get(source).decode('utf-8-sig'))); header=next(rows)
    assert header[0] in ('observation_date','DATE') and header[1]==series
    points=[]
    for date,value,*_ in rows:
        if value not in ('','.'):points.append({'date':date,'value':float(value)})
    names={'DFII10':('米10年実質金利','%'),'DEXJPUS':('ドル円（FRB日次）','JPY / USD'),'DTWEXBGS':('FRB広範ドル指数','2006年1月=100')}
    name,unit=names[series]
    return {'name':name,'unit':unit,'source':source,'sourcePage':'https://fred.stlouisfed.org/series/'+series,'points':normalize(points),'note':'FRB公表値をFREDから取得。休日は欠測。金利変化は％ポイント、指数はDXYとは異なる系列。'}
def china():
    points=[];sources=[]
    for year in (2025,2026):
        source=f'https://www.safe.gov.cn/safe/{year}/0206/2711{5 if year==2025 else 6}.html'
        html=get(source).decode('utf-8')
        values=[int(v) for v in re.findall(r'(\d+)\s*万盎司',html)]
        assert 2<=len(values)<=24 and len(values)%2==0
        assert all(values[i]==values[i+1] for i in range(0,len(values),2))
        for month,value in enumerate(values[::2],1):
            points.append({'date':f'{year}-{month:02d}-01','value':value*0.311034768,'tenThousandOz':value})
        sources.append(source)
    return {'name':'中国人民銀行・金準備','unit':'t','source':sources[-1],'sourcePage':sources[-1],'sources':sources,'points':normalize(points,13)[-13:],'note':'SAFEの月末数量（万トロイオンス）をトン換算。日付は対象月を示します。保有変化であり取引約定ではありません。'}
def run():
    output=json.loads(TARGET.read_text(encoding='utf-8')) if TARGET.exists() else {'schemaVersion':1,'series':{}}
    jobs={'futures':futures,'gld':lambda:etf('gld'),'gldm':lambda:etf('gldm'),'DFII10':lambda:fred('DFII10'),'DEXJPUS':lambda:fred('DEXJPUS'),'DTWEXBGS':lambda:fred('DTWEXBGS'),'china':china}
    def update(item):
        key,fn=item;now=dt.datetime.now(UTC).isoformat()
        try:
            result=fn()
            old=output['series'].get(key)
            if old and old.get('points'):assert result['points'][-1]['date']>=old['points'][-1]['date'],'Refusing older data'
            result.update(fetchedAt=now,lastAttempt=now,status='ok');return key,result
        except Exception as exc:
            old=output['series'].get(key,{'name':key,'points':[]})
            old.update(status='update-failed',lastAttempt=now,error=type(exc).__name__)
            print(f'::warning::Source {key} failed ({type(exc).__name__}); retaining dated previous observations.')
            return key,old
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for key,result in pool.map(update,jobs.items()):output['series'][key]=result
    output['builtAt']=dt.datetime.now(UTC).isoformat()
    TARGET.parent.mkdir(parents=True,exist_ok=True);temp=TARGET.with_suffix('.tmp')
    temp.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(TARGET)
    print(json.dumps({k:{'status':v['status'],'latest':v['points'][-1]['date'] if v.get('points') else None} for k,v in output['series'].items()}))
if __name__=='__main__':run()
