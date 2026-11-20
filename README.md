# GOLD FLOW INTELLIGENCE

無料の金先物ポジションPWA。https://elmar50gr28-alt.github.io/gold-flow-intelligence/

元の「GOLD FLOW FREE PWA v0.2」のソースが取得できなかったため、要件に基づいて新規実装した1.0です。既存の koyomi には変更しません。

## データ
CFTC Disaggregated Futures Only dataset `72hh-3qpy`, contract `088691` (COMEX GOLD)。公式APIから直近156週を取得。ネット=ロング−ショート、単位は契約枚数。リアルタイム価格やドル建て資金流入額ではありません。各参加者のスプレッド建玉をロング・ショートに加算しません。

## 更新と公開
GitHub PagesのSourceをGitHub Actionsに設定。push / 手動実行 / 毎日22:30 UTC（日本時間翌7:30）に公式データを検証し、JSONを保存してPagesに公開。公表が遅れた場合は統計基準日を維持します。取得・検証失敗時はワークフローが失敗し、前回の公開を維持します。GitHubの都合により予約実行が遅延することがあり、公開リポジトリでは60日間活動がないと予約実行が無効化される場合があります。Actionsの状況を定期的に確認してください。

## ローカル
Python標準ライブラリのみ。
```
python scripts/update_data.py
python -m http.server 8080 --directory docs
```
PWAはHTTPSまたはlocalhostで動作。ホーム画面への追加、オフラインキャッシュ、期間切替、CSV/JSON保存に対応。個人認証情報・有料API・Cloudflareは不要。

## 現物価格
Gold API (https://gold-api.com/docs) の無料・キー不要エンドポイントからブラウザでUSD/ozとJPY/ozを取得。JPYは31.1034768で割って円/gを表示。国内税込店頭価格ではありません。画面表示中は60秒間隔で取得。更新時刻をJSTで表示し、10分以上古い場合や保存済み価格には明示します。接続失敗時は日時を付けた保存済み価格か取得失敗表示とし、数値を捏造しません。価格取得はCFTC更新から独立しています。

## 実名機関
中央銀行6行の2026年7–9月の金準備増減（WGC公表値）と、SOFAZ公式の9月末保有量を掲載。中国はSAFEの10月末公表値も別期間として掲載。資料確認日は2026-11-20。`docs/data/institutions.json` は出典を確認して登録したスナップショットで、自動更新対象ではありません。先物の匿名集計・ETFの保管銀行から実名の購入者を推測しません。保有量の変化と売買の約定を同一視しません。
