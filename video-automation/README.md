# 動画クリップ自動生成

写真・動画を `video-automation/input/` フォルダに追加してこのリポジトリにpushするだけで、
GitHub Actionsが自動でプロモーション動画(縦型 1080x1920、テロップ「湘南タナバタフィールド」・
トランジション付き)を生成し、`video-automation/output/` に書き出します。

## 使い方

1. GitHubのリポジトリページを開き、`video-automation/input` フォルダに入る
2. 「Add file」→「Upload files」から、スマホの写真・動画をドラッグ&ドロップ
3. 画面下部でそのままコミット(Commit changes)
4. 数分待つと、GitHub Actionsが自動で
   - 動画を生成して `video-automation/output/` に追加
   - キャプションを自動生成
   - Instagram連携が設定済みなら、そのままInstagramのReelsとして自動投稿
5. Instagram連携が未設定の場合は、`video-automation/output/` から動画をダウンロードして
   手動で投稿する

処理が終わった素材は自動的に `video-automation/input/_archive/` に移動するので、
次にアップロードする際は新しい写真・動画だけを入れればよい。

## Instagramへの自動投稿

`INSTAGRAM_ACCESS_TOKEN` と `INSTAGRAM_BUSINESS_ACCOUNT_ID` をGitHub Secretsに設定すると、
動画生成後に自動でInstagramのReelsとして投稿される。未設定の場合はこのステップはスキップされ、
動画とキャプションが `video-automation/output/` に残るだけになる(手動投稿用)。

キャプションは `video-automation/scripts/generate-caption.js` のテンプレートから自動生成される
(無料・API不要)。文言を変更したい場合はこのファイルを編集する。

この機能を使うにはリポジトリの GitHub Pages(Settings → Pages → Source: GitHub Actions)を
有効にしておく必要がある。生成された動画をInstagramが取得できるよう、一時的に公開URLとして
ホスティングするために使用する。

## BGMを追加したい場合

`video-automation/bgm/` フォルダに、著作権フリー(商用利用・SNS投稿可)の音楽ファイル
(mp3 / m4a / wav)を1つ追加してpushすると、以後生成される動画に自動でBGMが付く
(フェードアウト付き)。ファイルがなければBGMなしで生成される。

## 生成される動画の仕様

- サイズ:1080×1920(Instagramリール・ストーリーズ向けの縦型)
- 1素材あたり3秒表示、クロスフェードで接続
- テロップ:「湘南タナバタフィールド」を画面下部に固定表示
- 対応形式:写真(jpg/jpeg/png/webp)、動画(mp4/mov/m4v)
