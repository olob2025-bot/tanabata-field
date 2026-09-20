#!/usr/bin/env node
/**
 * Instagram Graph API (Content Publishing API) を使い、公開URL上の動画をReelsとして投稿する。
 *
 * 使い方: node publish-instagram.js <videoUrl> <caption>
 *
 * 必要な環境変数:
 *   INSTAGRAM_ACCESS_TOKEN         System User の長期アクセストークン
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID  投稿先のInstagramビジネスアカウントID
 */
const IG_API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${IG_API_VERSION}`;

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const videoUrl = process.argv[2];
const caption = process.argv[3] || "";

function requireEnv() {
  if (!accessToken || !igUserId) {
    console.error(
      "INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID が設定されていません。Instagram投稿をスキップします。"
    );
    process.exit(0);
  }
  if (!videoUrl) {
    console.error("動画の公開URLが指定されていません。");
    process.exit(1);
  }
}

async function createContainer() {
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    access_token: accessToken,
  });
  const res = await fetch(`${BASE}/${igUserId}/media`, {
    method: "POST",
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`メディアコンテナの作成に失敗しました: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function waitUntilReady(creationId, { intervalMs = 10000, maxAttempts = 30 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const params = new URLSearchParams({
      fields: "status_code,status",
      access_token: accessToken,
    });
    const res = await fetch(`${BASE}/${creationId}?${params}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`ステータス確認に失敗しました: ${JSON.stringify(data)}`);
    }
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error(`Instagram側での動画処理に失敗しました: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("動画処理がタイムアウトしました(時間内にFINISHEDになりませんでした)。");
}

async function publish(creationId) {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const res = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: "POST",
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`投稿の公開に失敗しました: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function main() {
  requireEnv();
  console.log("Instagramメディアコンテナを作成しています...");
  const creationId = await createContainer();
  console.log(`作成しました(creation_id=${creationId})。動画の処理完了を待っています...`);
  await waitUntilReady(creationId);
  console.log("処理が完了しました。投稿を公開します...");
  const mediaId = await publish(creationId);
  console.log(`公開しました: media_id=${mediaId}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
