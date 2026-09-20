#!/usr/bin/env node
/**
 * video-automation/input/ にある写真・動画から、テロップ(施設名)・トランジション・BGM付きの
 * 縦型(1080x1920)プロモーション動画を自動生成し、video-automation/output/ に書き出す。
 * 処理済みの素材は video-automation/input/_archive/<timestamp>/ に移動する。
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "input");
const ARCHIVE_DIR = path.join(INPUT_DIR, "_archive");
const BGM_DIR = path.join(ROOT, "bgm");
const OUTPUT_DIR = path.join(ROOT, "output");

const SEG_DURATION = 3; // 1素材あたりの表示秒数
const FADE_DURATION = 1; // クロスフェードの長さ(秒)
const WIDTH = 1080;
const HEIGHT = 1920;
const FACILITY_NAME = "湘南タナバタフィールド";
const FONT_FILE =
  process.env.FONT_FILE ||
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v"]);

function listInputFiles() {
  if (!fs.existsSync(INPUT_DIR)) return [];
  return fs
    .readdirSync(INPUT_DIR)
    .filter((name) => {
      const full = path.join(INPUT_DIR, name);
      if (!fs.statSync(full).isFile()) return false;
      const ext = path.extname(name).toLowerCase();
      return IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext);
    })
    .sort()
    .map((name) => path.join(INPUT_DIR, name));
}

function normalizeSegment(srcPath, index, workDir) {
  const ext = path.extname(srcPath).toLowerCase();
  const outPath = path.join(workDir, `seg_${index}.mp4`);
  const vf = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=30,format=yuv420p`;
  const args = IMAGE_EXT.has(ext)
    ? ["-y", "-loop", "1", "-i", srcPath, "-t", String(SEG_DURATION)]
    : ["-y", "-i", srcPath, "-t", String(SEG_DURATION)];

  execFileSync(
    "ffmpeg",
    [...args, "-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast", outPath],
    { stdio: "inherit" }
  );
  return outPath;
}

function findBgm() {
  if (!fs.existsSync(BGM_DIR)) return null;
  const files = fs
    .readdirSync(BGM_DIR)
    .filter((f) => /\.(mp3|m4a|wav|aac)$/i.test(f));
  if (files.length === 0) return null;
  return path.join(BGM_DIR, files[0]);
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function buildFilterComplex(segmentCount, bgmIndex, totalDuration) {
  const drawtext = `drawtext=fontfile=${FONT_FILE}:text='${escapeDrawtext(
    FACILITY_NAME
  )}':fontcolor=white:fontsize=54:borderw=3:bordercolor=black@0.6:x=(w-text_w)/2:y=h-160`;

  let filter;
  if (segmentCount === 1) {
    filter = `[0:v]${drawtext}[vtext]`;
  } else {
    let parts = [];
    let prevLabel = "0";
    for (let i = 1; i < segmentCount; i++) {
      const offset = i * (SEG_DURATION - FADE_DURATION);
      const outLabel = i === segmentCount - 1 ? "vchain" : `v${i}`;
      parts.push(
        `[${prevLabel}][${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}[${outLabel}]`
      );
      prevLabel = outLabel;
    }
    parts.push(`[vchain]${drawtext}[vtext]`);
    filter = parts.join("; ");
  }

  if (bgmIndex !== null) {
    const fadeStart = Math.max(totalDuration - 1, 0);
    filter += `; [${bgmIndex}:a]atrim=0:${totalDuration},afade=t=out:st=${fadeStart}:d=1,asetpts=PTS-STARTPTS[aout]`;
  }

  return filter;
}

function main() {
  const files = listInputFiles();
  if (files.length === 0) {
    console.log(
      "input/ に写真・動画が見つかりませんでした。処理をスキップします。"
    );
    return;
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-gen-"));
  const segments = files.map((f, i) => normalizeSegment(f, i, workDir));
  const n = segments.length;
  const totalDuration = n * SEG_DURATION - (n - 1) * FADE_DURATION;

  const bgm = findBgm();
  const inputArgs = segments.flatMap((s) => ["-i", s]);
  const bgmIndex = bgm ? n : null;
  if (bgm) inputArgs.push("-i", bgm);

  const filter = buildFilterComplex(n, bgmIndex, totalDuration);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const outPath = path.join(OUTPUT_DIR, `tanabata-field-${timestamp}.mp4`);

  const args = ["-y", ...inputArgs, "-filter_complex", filter, "-map", "[vtext]"];
  if (bgm) args.push("-map", "[aout]");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20");
  if (bgm) args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-t", String(totalDuration), outPath);

  execFileSync("ffmpeg", args, { stdio: "inherit" });

  const archiveSub = path.join(ARCHIVE_DIR, timestamp);
  fs.mkdirSync(archiveSub, { recursive: true });
  for (const f of files) {
    fs.renameSync(f, path.join(archiveSub, path.basename(f)));
  }

  fs.rmSync(workDir, { recursive: true, force: true });

  console.log(`Generated: ${outPath}`);
  console.log(`::set-output name=video_path::${outPath}`);
}

main();
