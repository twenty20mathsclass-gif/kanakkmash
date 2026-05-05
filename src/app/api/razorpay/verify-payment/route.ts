import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        const isValid = validatePaymentVerification(
            { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET!
        );

        if (isValid) {
            return NextResponse.json({ verified: true });
        } else {
            console.error('Razorpay signature mismatch', { razorpay_order_id, razorpay_payment_id });
            return NextResponse.json({ verified: false, error: 'Signature mismatch' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Razorpay signature verification failed:', error);
        return NextResponse.json({ error: 'Verification failed', details: error.message }, { status: 500 });
    }
}
