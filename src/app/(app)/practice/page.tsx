import { PracticeGenerator } from "@/components/practice/practice-generator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PracticePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">AI Practice Center</h1>
        <p className="text-muted-foreground">
          Generate custom practice problems for any topic to sharpen your skills.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create Your Worksheet</CardTitle>
          <CardDescription>
            Select a topic and difficulty level to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <PracticeGenerator standalone={true} />
        </CardContent>
      </Card>
    </div>
  );
}
