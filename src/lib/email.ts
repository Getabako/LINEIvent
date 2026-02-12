import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatDateJST(dateStr: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateStr));
}

export async function sendReservationConfirmationEmail(
  to: string,
  displayName: string,
  eventTitle: string,
  eventDate: string,
  venue: string,
  amount: number
) {
  const formattedDate = formatDateJST(eventDate);
  const formattedAmount =
    amount === 0
      ? "無料"
      : new Intl.NumberFormat("ja-JP", {
          style: "currency",
          currency: "JPY",
        }).format(amount);

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: 'Hiragino Sans', 'Meiryo', sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      <div style="background-color:#06c755; padding:24px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:20px;">予約確定のお知らせ</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">${displayName} 様</p>
        <p style="margin:0 0 24px;">以下のイベントのご予約が確定しました。</p>

        <div style="background-color:#f9f9f9; border-radius:8px; padding:16px; margin-bottom:24px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0; color:#666; width:80px;">イベント</td>
              <td style="padding:8px 0; font-weight:bold;">${eventTitle}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#666;">日時</td>
              <td style="padding:8px 0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#666;">会場</td>
              <td style="padding:8px 0;">${venue}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#666;">金額</td>
              <td style="padding:8px 0;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <p style="margin:0; color:#666; font-size:14px;">
          ※ このメールは自動送信です。ご不明な点がございましたら、主催者までお問い合わせください。
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `【予約確定】${eventTitle}`,
    html,
  });
}

export async function sendCancellationEmail(
  to: string,
  displayName: string,
  eventTitle: string,
  eventDate: string,
  refunded: boolean
) {
  const formattedDate = formatDateJST(eventDate);

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: 'Hiragino Sans', 'Meiryo', sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      <div style="background-color:#666666; padding:24px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:20px;">予約キャンセルのお知らせ</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">${displayName} 様</p>
        <p style="margin:0 0 24px;">以下のイベントの予約がキャンセルされました。</p>

        <div style="background-color:#f9f9f9; border-radius:8px; padding:16px; margin-bottom:24px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0; color:#666; width:80px;">イベント</td>
              <td style="padding:8px 0; font-weight:bold;">${eventTitle}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#666;">日時</td>
              <td style="padding:8px 0;">${formattedDate}</td>
            </tr>
          </table>
        </div>

        ${
          refunded
            ? '<p style="margin:0 0 16px;">お支払い済みの金額は返金処理が行われます。返金の反映には数日かかる場合があります。</p>'
            : ""
        }

        <p style="margin:0; color:#666; font-size:14px;">
          ※ このメールは自動送信です。
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `【予約キャンセル】${eventTitle}`,
    html,
  });
}
