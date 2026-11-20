"""Fetch official CFTC disaggregated futures-only GOLD data, atomically."""
import datetime as dt
import json
import pathlib
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = 'https://publicreporting.cftc.gov/resource/72hh-3qpy.json'
FIELDS = ['report_date_as_yyyy_mm_dd', 'cftc_contract_market_code', 'open_interest_all', 'm_money_positions_long_all', 'm_money_positions_short_all', 'prod_merc_positions_long', 'prod_merc_positions_short', 'swap_positions_long_all', 'swap__positions_short_all', 'other_rept_positions_long', 'other_rept_positions_short', 'nonrept_positions_long_all', 'nonrept_positions_short_all']

def normalize(rows):
    records = []
    groups = {'managed': ('m_money_positions_long_all', 'm_money_positions_short_all'), 'producer': ('prod_merc_positions_long', 'prod_merc_positions_short'), 'swap': ('swap_positions_long_all', 'swap__positions_short_all'), 'other': ('other_rept_positions_long', 'other_rept_positions_short'), 'nonreportable': ('nonrept_positions_long_all', 'nonrept_positions_short_all')}
    seen = set()
    for row in rows:
        assert row['cftc_contract_market_code'] == '088691', 'Wrong contract'
        day = dt.date.fromisoformat(row['report_date_as_yyyy_mm_dd'][:10])
        assert day <= dt.datetime.now(dt.timezone.utc).date(), 'Future report'
        assert str(day) not in seen, 'Duplicate report'
        seen.add(str(day))
        item = {'date': str(day), 'openInterest': int(row['open_interest_all'])}
        assert item['openInterest'] > 0
        for name, (long_key, short_key) in groups.items():
            long, short = int(row[long_key]), int(row[short_key])
            assert 0 <= long <= item['openInterest'] and 0 <= short <= item['openInterest']
            item[name] = {'long': long, 'short': short, 'net': long-short}
        records.append(item)
    records.sort(key=lambda row: row['date'])
    assert len(records) >= 52, 'Insufficient history'
    return records

def main():
    query = urllib.parse.urlencode({'$where': "cftc_contract_market_code='088691'", '$order': 'report_date_as_yyyy_mm_dd DESC', '$limit': '156', '$select': ','.join(FIELDS)})
    request = urllib.request.Request(API+'?'+query, headers={'User-Agent': 'GoldFlowIntelligence/1.0 (public CFTC statistics)'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                records = normalize(json.load(response))
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt+1))
    target = ROOT / 'docs/data/cftc.json'
    if target.exists():
        old = json.loads(target.read_text(encoding='utf-8'))
        assert records[-1]['date'] >= old['records'][-1]['date'], 'Refusing older data'
    output = {'schemaVersion': 1, 'source': API, 'market': 'GOLD - COMMODITY EXCHANGE INC.', 'contractCode': '088691', 'reportType': 'Disaggregated Futures Only', 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'records': records}
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temp.replace(target)
    print(f"Validated {len(records)} reports; latest {records[-1]['date']}; managed net {records[-1]['managed']['net']:,}")

if __name__ == '__main__':
    main()
