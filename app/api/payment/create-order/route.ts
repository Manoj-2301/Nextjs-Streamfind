import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { admin } from '@/lib/firebaseAdmin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Auth verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid Token' }, { status: 401 });
    }

    // You can customize the amount based on plans
    // For now, let's hardcode a premium price, e.g., INR 999
    const amount = 999;
    const currency = 'INR';

    const options = {
      amount: amount * 100, // Razorpay amount is in paise
      currency,
      // Receipt must be <= 40 characters for Razorpay
      receipt: `rcpt_${Date.now().toString().substring(5)}_${decodedToken.uid.substring(0, 5)}`,
      notes: {
        userId: decodedToken.uid,
        plan: 'premium',
      },
    };

    const order = await razorpay.orders.create(options);
    
    return NextResponse.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
