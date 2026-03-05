
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TeacherSalaryHistoryPage() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Page Moved</CardTitle>
                    <CardDescription>
                        The salary history is now part of the "My Revenue" page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">To provide a more integrated experience, we've moved your salary history into the "My Revenue" section.</p>
                    <Button asChild>
                        <Link href="/teacher/revenue">Go to My Revenue</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
