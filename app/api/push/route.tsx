import webpush from 'web-push';

const vapidKeys = {
  publicKey: "BC_R-09PEHK4oePTLQwpb6tICfyvjUxBnTqUBUuWWtW97CpMTYpQzOoyn6jt71zAnNP9SfhRerq3FPwvNvZvJVQ",
  privateKey: "E6JscP9BKUpA3lAcWM0WmCX_pb525k1DsKvMq1Mxbg4",
};

webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "DiscipleOS",
        body: "Push test from server",
      })
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  }
}