# FoodTrack 69 AI — iPhone版

172cm / 68kg前後 → 69kg前後を目標に、食事・PFC・体重・ウエスト・進捗写真をまとめて管理する個人用Webアプリです。

## 追加した機能

- iPhone向けモバイルUI / ホーム画面に追加できるPWA
- iPhoneカメラから食事写真を撮影
- AIによる料理・量・kcal・P/F/Cの推定
- AI推定値を編集してから保存
- 今日のPFC・トレーニング区分・体重推移を踏まえたAI食事アドバイス
- 体重・ウエストの記録、7日平均
- 正面 / 横 / 背面、リラックス / 力ありの身体写真保存
- 身体写真はIndexedDBに端末内保存し、AI APIには送信しない
- JSONによる食事・体重データのバックアップ
- アプリ画面のオフラインキャッシュ（AI分析はオンライン必須）

## AI栄養推定について

写真から正確な重量、調理油、ソースなどを完全には特定できません。AI分析は「推定値」として表示し、保存前にユーザーがkcal/P/F/Cを修正できます。包装食品では栄養成分表示がある場合、その数値を優先してください。

## なぜAI部分はHTML単体では動かないのか

OpenAI APIキーをブラウザのJavaScriptに直接埋め込むと、第三者にキーを見られる可能性があります。このプロジェクトではAPIキーをサーバー側の環境変数 `OPENAI_API_KEY` に置き、`/api/analyze-meal` と `/api/advice` からOpenAI APIへ接続する構成です。

## Vercelで公開する手順

1. このフォルダをGitHubリポジトリにアップロードする。
2. VercelでそのリポジトリをImportする。
3. Vercelの Project Settings → Environment Variables で `OPENAI_API_KEY` を追加する。
4. Deployする。
5. 発行されたHTTPS URLをiPhoneのSafariで開く。
6. Safariの共有メニュー →「ホーム画面に追加」→「Webアプリとして開く」をオン → 追加。

## ローカル開発

Node.jsがあるPCで:

```bash
npm install
# .env.local に OPENAI_API_KEY=... を設定
npx vercel dev
```

ブラウザで表示されたlocalhost URLを開きます。

## データ保存

- 食事・体重・設定: localStorage
- 身体写真: IndexedDB
- 食事写真: AI分析時だけサーバー経由でOpenAI APIへ送信し、アプリ側では写真自体を食事記録として保存しません
- 身体写真: AIへ送信しません

ブラウザデータを削除すると端末内データが消える可能性があるため、食事・体重データは定期的にJSONバックアップしてください。
