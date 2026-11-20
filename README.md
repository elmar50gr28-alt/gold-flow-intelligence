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
