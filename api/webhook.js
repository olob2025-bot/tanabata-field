const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("@line/bot-sdk");
const Anthropic = require("@anthropic-ai/sdk");

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const lineClient = new Client({ channelAccessToken, channelSecret });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "knowledge", "system-prompt.md"),
  "utf-8"
);

// これらのキーワードを含むメッセージはAIに渡さず、即座に有人対応へ案内する
const ESCALATION_KEYWORDS = [
  "担当者",
  "オペレーター",
  "スタッフ",
  "クレーム",
  "苦情",
  "人と話",
];

module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function isValidSignature(rawBody, signature) {
  if (!signature || !channelSecret) return false;
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const userText = event.message.text;

  if (ESCALATION_KEYWORDS.some((kw) => userText.includes(kw))) {
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "担当スタッフにおつなぎします。営業時間内であれば折り返しご連絡いたします。営業時間外の場合は翌営業日にご連絡いたします。",
    });
    return;
  }

  let replyText;
  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    });
    replyText = completion.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  } catch (err) {
    console.error("Anthropic API error:", err);
    replyText =
      "申し訳ございません、只今回答をご用意できませんでした。担当スタッフにおつなぎしますので少々お待ちください。";
  }

  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: replyText,
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!isValidSignature(rawBody, signature)) {
    res.status(401).send("Invalid signature");
    return;
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];

  try {
    await Promise.all(events.map(handleEvent));
  } catch (err) {
    console.error("Webhook handling error:", err);
  }

  res.status(200).send("OK");
};
