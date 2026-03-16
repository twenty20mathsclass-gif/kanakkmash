'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateSchedulePagePlaceholder() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/teacher/create-schedule');
    }, [router]);

    return null;
}