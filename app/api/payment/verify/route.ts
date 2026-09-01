/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { admin } from '@/lib/firebaseAdmin';

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

    const userId = decodedToken.uid;
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency } = body;

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET as string;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Payment is authentic, update user in Firestore
    const userRef = admin.firestore().collection('users').doc(userId);
    
    const invoice = {
      id: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amount / 100, // Converting from paise to INR
      currency,
      date: new Date(),
      status: 'paid',
      plan: 'premium'
    };

    // Use a transaction or batch to ensure atomic update
    await admin.firestore().runTransaction(async (transaction: any) => {
      const doc = await transaction.get(userRef);
      
      const updateData: any = {
        plan: 'premium',
        subscriptionUpdatedAt: new Date()
      };
      
      if (!doc.exists) {
        updateData.invoices = [invoice];
        transaction.set(userRef, updateData, { merge: true });
      } else {
        const data = doc.data() || {};
        const existingInvoices = data.invoices || [];
        updateData.invoices = [invoice, ...existingInvoices];
        transaction.update(userRef, updateData);
      }
    });
    
    // We could log a security event here if needed

    return NextResponse.json({ success: true, message: 'Payment verified and plan updated' }, { status: 200 });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
