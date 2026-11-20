import datetime as dt,importlib.util,json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class MarketTests(unittest.TestCase):
 def setUp(self):
  self.data=json.loads((ROOT/'docs/data/market.json').read_text(encoding='utf-8'))['series']
 def test_observations(self):
  for key,s in self.data.items():
   points=s.get('points',[])
   self.assertTrue(points,key+' has no last-good data')
   self.assertEqual(len(points),len({p['date'] for p in points}))
   self.assertEqual(points,sorted(points,key=lambda p:p['date']))
   self.assertTrue(s['sourcePage'].startswith('https://'))
   self.assertIn(s['status'],('ok','update-failed','verified-snapshot'))
   for p in points:self.assertLessEqual(dt.date.fromisoformat(p['date']),dt.datetime.now(dt.timezone.utc).date())
 def test_gold_units(self):
  for key in ('gld','gldm'):
   points=self.data[key]['points'];self.assertGreaterEqual(len(points),22)
   self.assertTrue(all(0<p['value']<10000 for p in points))
  self.assertNotEqual(self.data['gld']['points'][-1]['value'],self.data['gldm']['points'][-1]['value'])
 def test_china(self):
  points=self.data['china']['points'];self.assertGreaterEqual(len(points),13)
  for p in points:self.assertAlmostEqual(p['value'],p['tenThousandOz']*.311034768,8)
  self.assertAlmostEqual(sum(points[i]['value']-points[i-1]['value'] for i in range(1,len(points))),points[-1]['value']-points[0]['value'])
 def test_cftc_reconciliation(self):
  rows=json.loads((ROOT/'docs/data/cftc.json').read_text(encoding='utf-8'))['records']
  for r in rows:
   for g in ('managed','producer','swap','other','nonreportable'):self.assertEqual(r[g]['net'],r[g]['long']-r[g]['short'])
  for span in (1,4,13):
   a,b=rows[-1]['managed'],rows[-1-span]['managed']
   self.assertEqual(a['net']-b['net'],(a['long']-b['long'])-(a['short']-b['short']))
 def test_futures_excludes_today(self):
  points=self.data['futures']['points'];self.assertGreaterEqual(len(points),22)
  self.assertLess(dt.date.fromisoformat(points[-1]['date']),dt.datetime.now(dt.timezone.utc).date())
if __name__=='__main__':unittest.main()
