/**
 * Instagram投稿用キャプションを自動生成する(無料・API不要のテンプレート方式)。
 * 日付ベースでテンプレートをローテーションし、同じ日に複数回実行しても同じ文言になる。
 */

const TEMPLATES = [
  "今日の湘南タナバタフィールド🌿\n人工芝の広々グラウンドで、思いきり体を動かしませんか?\nご予約はプロフィールのリンクから。",
  "青空の下、絶好のコンディション⚽\n少人数から団体まで、湘南タナバタフィールドはいつでも皆さまをお待ちしています。\nご予約・お問い合わせはプロフィールから。",
  "湘南エリアで人工芝グラウンドをお探しなら、湘南タナバタフィールドへ。\n初めての方もお気軽にどうぞ。\nご予約はプロフィールのリンクから。",
  "仲間と、家族と、思い出に残る時間を。\n湘南タナバタフィールドで、次の週末の予定を決めませんか?\nご予約はプロフィールから。",
  "広々とした人工芝コートで、いつでも快適にプレーできます。\n湘南タナバタフィールドで一緒に汗を流しましょう。\nご予約はプロフィールのリンクから。",
];

const HASHTAGS = [
  "#湘南タナバタフィールド",
  "#湘南",
  "#フットサル",
  "#サッカー",
  "#人工芝グラウンド",
  "#レンタルグラウンド",
  "#神奈川",
  "#スポーツ施設",
];

function pickTemplate(date) {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  );
  return TEMPLATES[dayOfYear % TEMPLATES.length];
}

function generateCaption(date = new Date()) {
  const body = pickTemplate(date);
  return `${body}\n\n${HASHTAGS.join(" ")}`;
}

module.exports = { generateCaption };
