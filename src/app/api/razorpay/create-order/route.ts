import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
    try {
        const { amount, currency = 'INR', receipt } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error: any) {
        console.error('Razorpay order creation failed:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order', details: error.message },
            { status: 500 }
        );
    }
}
