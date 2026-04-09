import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Return the response exactly as requested by the user
    return NextResponse.json({
      status: 'pending',
      message: 'Please join WhatsApp first',
      join_link: 'https://wa.me/14155238886?text=join%20rate-topic'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process registration' }, { status: 500 });
  }
}
