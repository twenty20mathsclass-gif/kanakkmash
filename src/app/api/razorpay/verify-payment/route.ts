import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            return NextResponse.json({ verified: true });
        } else {
            return NextResponse.json({ verified: false, error: 'Signature mismatch' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Razorpay signature verification failed:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
