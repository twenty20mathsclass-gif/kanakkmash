import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  PlayCircle,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  Target,
  Facebook,
  Youtube,
  Twitter,
} from 'lucide-react';
import { Reveal } from '@/components/shared/reveal';

const StatBubble = ({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) => {
  const Icon = icon;
  return (
    <div
      className={`absolute flex items-center gap-2 rounded-full border bg-background/80 p-2 pr-3 shadow-lg backdrop-blur-sm ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

const SocialIcon = ({
  icon,
  className,
}: {
  icon: React.ElementType;
  className?: string;
}) => {
  const Icon = icon;
  return (
    <div
      className={`absolute flex h-10 w-10 items-center justify-center rounded-full border bg-background/80 shadow-lg backdrop-blur-sm ${className}`}
    >
      <Icon className="h-6 w-6 text-primary" />
    </div>
  );
};

export default function AboutUsPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'about-hero-woman');
  const founderImage = PlaceHolderImages.find((img) => img.id === 'fida-shirin');
  const service1Image = PlaceHolderImages.find((img) => img.id === 'about-service-1');
  const service2Image = PlaceHolderImages.find((img) => img.id === 'about-service-2');
  const service3Image = PlaceHolderImages.find((img) => img.id === 'about-service-3');

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Hero Section */}
      <Reveal>
        <section className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <Badge variant="secondary" className="text-base font-semibold">
              Welcome to Kanakkmash
            </Badge>
            <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Unlock Your Math Superpowers
            </h1>
            <p className="text-lg text-muted-foreground">
              We provide top-quality mathematics classes for students of all
              levels, from primary school to competitive exams, helping them
              excel and build a strong foundation for the future.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button size="lg" variant="ghost">
                <PlayCircle className="mr-2" />
                Watch Intro
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                <Avatar>
                  <AvatarImage src="https://picsum.photos/seed/avatar1/40/40" />
                  <AvatarFallback>S1</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://picsum.photos/seed/avatar2/40/40" />
                  <AvatarFallback>S2</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://picsum.photos/seed/avatar3/40/40" />
                  <AvatarFallback>S3</AvatarFallback>
                </Avatar>
              </div>
              <p className="font-medium text-muted-foreground">
                3460+ Satisfied Students
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute z-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative aspect-square h-[400px]">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  width={500}
                  height={500}
                  className="h-full w-full rounded-full border-8 border-background object-cover shadow-2xl"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
              <div className="absolute inset-0 z-10 rounded-full border-[10px] border-dashed border-primary/20" />
              <div className="absolute inset-0 z-10 animate-spin-slow rounded-full border-[10px] border-dashed border-primary/20 border-t-transparent" />
              <StatBubble
                icon={TrendingUp}
                label="Success Rate"
                value="98%"
                className="bottom-8 -left-12"
              />
              <StatBubble
                icon={Users}
                label="Graduates"
                value="180+"
                className="right-0 top-16"
              />
              <SocialIcon icon={Facebook} className="-top-4 left-1/4" />
              <SocialIcon icon={Youtube} className="left-[-5%] top-1/3" />
              <SocialIcon icon={Twitter} className="right-[-5%] bottom-1/4" />
            </div>
          </div>
        </section>
      </Reveal>

      {/* Why Choose Us Section */}
      <Reveal>
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-headline text-3xl font-bold sm:text-4xl">
              Why Choose Kanakkmash?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              We're dedicated to providing the best learning experience with a
              focus on results and student satisfaction.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Award,
                title: 'Expert Tutors',
                text: 'Learn from experienced educators who are masters in mathematics.',
              },
              {
                icon: Clock,
                title: 'Flexible Timing',
                text: 'Our schedules are designed to fit your busy life, not the other way around.',
              },
              {
                icon: DollarSign,
                title: 'Affordable Pricing',
                text: 'High-quality education that doesn’t break the bank.',
                isPrimary: true,
              },
              {
                icon: Target,
                title: 'Proven Strategy',
                text: 'Our teaching methods are tested and proven to deliver great results.',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className={`h-full text-center ${
                    feature.isPrimary
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  }`}
                >
                  <CardContent className="p-8">
                    <Icon
                      className={`mx-auto h-12 w-12 ${
                        feature.isPrimary
                          ? 'text-primary-foreground'
                          : 'text-primary'
                      }`}
                    />
                    <h3 className="mt-4 font-headline text-xl font-bold">
                      {feature.title}
                    </h3>
                    <p
                      className={`mt-2 text-sm ${
                        feature.isPrimary
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {feature.text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Meet Our Mentor Section */}
      <Reveal>
        <section className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative flex items-center justify-center">
            <div className="absolute z-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative aspect-square h-[400px] -mt-8">
              {founderImage && (
                <Image
                  src={founderImage.imageUrl}
                  alt={founderImage.description}
                  width={500}
                  height={500}
                  className="h-full w-full rounded-full object-cover shadow-2xl"
                  data-ai-hint={founderImage.imageHint}
                />
              )}
            </div>
          </div>
          <div className="space-y-6">
            <Badge variant="outline" className="font-semibold">
              Meet Our Head Mentor
            </Badge>
            <h2 className="font-headline text-3xl font-bold sm:text-4xl">
              FIDA SHIRIN G
            </h2>
            <p className="font-bold text-primary">Founder, CEO & Head Mentor</p>
            <p className="text-muted-foreground">
              With 5+ years of experience, Fida Shirin G leads Kanakkmash with a passion for making math accessible. Holding a BSc in Mathematics, DElEd, and KTET qualifications, she developed the innovative "20-20 maths class" strategy, guiding numerous students to success.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
                <Badge>BSc Maths</Badge>
                <Badge>DElEd</Badge>
                <Badge>KTET Certified</Badge>
                <Badge>5+ Years Experience</Badge>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Services Section */}
      <Reveal>
        <section className="space-y-8">
          <div className="text-center">
            <Badge>Our Services</Badge>
            <h2 className="mt-2 font-headline text-3xl font-bold sm:text-4xl">
              We Provide The Best Service For You
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Choose from our range of services designed to meet the diverse
              needs of our students.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Online Group Tuition',
                text: 'Interactive group classes covering various syllabuses.',
                image: service1Image,
              },
              {
                title: 'One-to-One Classes',
                text: 'Personalized attention and a curriculum tailored just for you.',
                image: service2Image,
              },
              {
                title: 'Competitive Exam Prep',
                text: 'Specialized coaching to help you ace competitive exams.',
                image: service3Image,
              },
            ].map((service, index) => (
              <Card key={index} className="overflow-hidden">
                {service.image && (
                  <div className="aspect-video overflow-hidden">
                    <Image
                      src={service.image.imageUrl}
                      alt={service.title}
                      width={600}
                      height={400}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      data-ai-hint={service.image.imageHint}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {service.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
