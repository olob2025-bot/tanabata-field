#!/usr/bin/env node
/**
 * 生成した動画をVercel Blob(無料ストレージ)にアップロードし、公開URLを取得する。
 * InstagramのGraph APIが動画を取得するための一時的な公開URLとして使う。
 *
 * 使い方: node upload-blob.js <videoFilePath>
 * 必要な環境変数: BLOB_READ_WRITE_TOKEN
 */
const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("アップロードする動画ファイルのパスを指定してください。");
    process.exit(1);
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log(
      "BLOB_READ_WRITE_TOKEN が設定されていません。アップロードをスキップします。"
    );
    return;
  }

  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const blob = await put(`videos/${filename}`, fileBuffer, {
    access: "public",
    token,
    contentType: "video/mp4",
  });

  console.log(`Uploaded: ${blob.url}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `blob_url=${blob.url}\n`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
