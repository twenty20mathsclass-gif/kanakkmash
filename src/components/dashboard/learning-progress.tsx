'use client';
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, Clock, Flame } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";

type ProgressCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
};

function ProgressCard({ title, value, icon, color, delay = 0 }: ProgressCardProps) {
  return (
    <Reveal delay={delay}>
      <Card style={{ backgroundColor: color }} className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center justify-center text-primary-foreground h-28">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </CardContent>
      </Card>
    </Reveal>
  );
}

export function LearningProgress() {
  return (
    <section>
      <h2 className="text-xl font-bold font-headline mb-4">Learning Progress</h2>
      <div className="grid grid-cols-3 gap-4">
        <ProgressCard 
          title="Total Time" 
          value="5h 48m" 
          icon={<Clock className="h-5 w-5" />}
          color="hsl(255 85% 65%)"
          delay={0.1}
        />
        <ProgressCard 
          title="Retention" 
          value="88%" 
          icon={<BrainCircuit className="h-5 w-5" />}
          color="hsl(30 95% 60%)"
          delay={0.2}
        />
        <ProgressCard 
          title="Streak" 
          value="03" 
          icon={<Flame className="h-5 w-5" />}
          color="hsl(270 85% 65%)"
          delay={0.3}
        />
      </div>
    </section>
  );
}
