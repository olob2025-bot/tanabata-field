# tanabata-field

湘南タナバタフィールド LINE公式アカウント AI自動応答Webhook

LINEに届いたお客様からのメッセージをAI(Claude API)が読み取り、自動で返信するWebhookです。
「担当者」「クレーム」等のキーワードを含むメッセージは、AIに渡さず即座に有人対応の案内に切り替えます。

## デプロイ手順(Vercel)

1. Vercelでこのリポジトリをインポートし、新規プロジェクトを作成する
2. プロジェクトの Settings > Environment Variables に以下の3つを設定する

   | 変数名 | 値の取得元 |
   | --- | --- |
   | `LINE_CHANNEL_SECRET` | LINE Developersコンソール > Messaging API設定 |
   | `LINE_CHANNEL_ACCESS_TOKEN` | 同上(長期トークンを発行) |
   | `ANTHROPIC_API_KEY` | console.anthropic.com で発行するAPIキー |

3. デプロイを実行する
4. デプロイ後に発行されたURL(例: `https://xxxx.vercel.app`)の末尾に `/api/webhook` を付けたものを、LINE Developersコンソールの「Messaging API設定」>「Webhook URL」に設定する
5. 「Webhookの利用」をONにする
6. LINE Official Account Managerの「応答設定」で、「応答メッセージ」「あいさつメッセージ」をOFFにする(このWebhookが全ての応答を処理するため)
7. LINE Developersコンソールの「Verify」ボタンで疎通確認を行う

## 運用前に必ずやること

`knowledge/system-prompt.md` 内の `[ TODO: ... ]` を、実際の営業時間・料金・アクセス・キャンセルポリシーなどの情報に書き換えてください。
ここに書かれていない内容についてAIは推測で答えず、「担当スタッフにおつなぎします」と返信します。

## ローカル開発

```
npm install
```

`.env.example` を参考に `.env` を作成してください(`.env` はコミットされません)。
