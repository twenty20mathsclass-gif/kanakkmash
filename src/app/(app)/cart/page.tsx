export const dynamic = 'force-dynamic';

export default function CartPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Shopping Cart</h1>
                <p className="text-muted-foreground">Review items in your cart.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Your cart is empty.
        </div>
    </div>
  );
}
