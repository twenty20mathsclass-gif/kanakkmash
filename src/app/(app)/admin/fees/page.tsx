'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFeesPagePlaceholder() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/admin/fees');
    }, [router]);

    return null;
}