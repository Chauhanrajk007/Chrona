import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { user_phone, message, time } = await req.json();

    if (!user_phone || !message || !time) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const targetTime = new Date(time).getTime();
    const currentTime = new Date().getTime();
    const delay = targetTime - currentTime;

    // Twilio Configuration
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886'; // Twilio Sandbox Number
    const targetWhatsAppNumber = `whatsapp:${user_phone}`;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("Twilio credentials missing. Reminder won't be sent.");
    }

    // Function to actually send the message
    const sendWhatsAppMessage = async () => {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const formData = new URLSearchParams();
        formData.append('To', targetWhatsAppNumber);
        formData.append('From', TWILIO_WHATSAPP_NUMBER);
        formData.append('Body', message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          },
          body: formData,
        });

        const data = await response.json();
        console.log('Twilio response:', data);
      } catch (err) {
        console.error('Failed to send Twilio WhatsApp message:', err);
      }
    };

    // Logic explicitly requested:
    // 1. Calculate delay = time - current time (done above)
    // 2. Wait until that time
    // 3. Send WhatsApp message using Twilio API

    if (delay <= 0) {
      // Send immediately if time has passed
      await sendWhatsAppMessage();
    } else {
      // Because Vercel Serverless functions have execution time limits (10s - 60s),
      // waiting via setTimeout for long periods will timeout in production on Vercel.
      // 
      // NOTE FOR PROD: For delays > 1 minute on Vercel, integrate an asynchronous 
      // job queue like Upstash QStash or Inngest.
      //
      // However, for local development/custom Node servers, this works:
      setTimeout(async () => {
        await sendWhatsAppMessage();
      }, delay);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Reminder scheduled successfully (Note: Vercel serverless has timeout limits for long delays.)',
      delay_ms: delay,
    });

  } catch (error) {
    console.error("Error in WhatsApp reminder route:", error);
    return NextResponse.json({ error: 'Failed to schedule reminder' }, { status: 500 });
  }
}
