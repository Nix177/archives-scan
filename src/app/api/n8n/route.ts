import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl.includes("example.com")) {
      // Dev mode without a real webhook: simulate success
      console.log("[Backend] Webhook payload intercepted (dev mode):", data.archive_data.titre);
      return NextResponse.json({ success: true, simulated: true });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Backend] Error forwarding to n8n:", error);
    return NextResponse.json({ success: false, error: "Failed to reach webhook" }, { status: 500 });
  }
}
