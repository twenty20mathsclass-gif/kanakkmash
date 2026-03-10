
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
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

// --- Hero Section Component and its helpers ---

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
      className={`absolute flex items-center gap-1 rounded-full border bg-background/80 p-1.5 pr-2.5 shadow-lg backdrop-blur-sm md:gap-2 md:p-2 md:pr-3 ${className}`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary md:h-8 md:w-8">
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <div>
        <p className="text-xs font-bold md:text-sm">{value}</p>
        <p className="text-[10px] text-muted-foreground md:text-xs">{label}</p>
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
      className={`absolute flex h-8 w-8 items-center justify-center rounded-full border bg-background/80 shadow-lg backdrop-blur-sm md:h-10 md:w-10 ${className}`}
    >
      <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
    </div>
  );
};

function HeroSection({ heroImage }: { heroImage?: ImagePlaceholder }) {
  return (
    <section className="container mx-auto px-4 pt-4 pb-12 md:px-6 md:pt-16">
      <div className="grid w-full max-w-6xl items-center gap-16 md:grid-cols-2">
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-transparent bg-secondary px-3 py-1.5 text-base font-semibold text-secondary-foreground">
            <span>Welcome to</span>
            <span className="bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent animate-gradient-pan [background-size:200%_auto] font-bold">
              Kanakkmash
            </span>
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Unlock Your Math Superpowers
          </h1>
          <p className="text-lg text-muted-foreground">
            We provide top-quality mathematics classes for students of all
            levels, from primary school to competitive exams, helping them
            excel and build a strong foundation for the future.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <Button size="lg" asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button size="lg" variant="ghost">
              <PlayCircle className="mr-2" />
              Watch Intro
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 pt-4 md:justify-start">
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
          <div className="absolute z-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl md:h-72 md:w-72" />
          <div className="relative aspect-square h-[300px] md:h-[400px]">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={500}
                height={500}
                className="h-full w-full rounded-full border-8 border-background object-contain p-8 shadow-2xl"
                data-ai-hint={heroImage.imageHint}
                unoptimized
              />
            )}
            <div className="absolute inset-0 z-10 rounded-full border-[10px] border-dashed border-primary/20" />
            <div className="absolute inset-0 z-10 animate-spin-slow rounded-full border-[10px] border-dashed border-primary/20 border-t-transparent" />
            <StatBubble
              icon={TrendingUp}
              label="Success Rate"
              value="98%"
              className="bottom-2 -left-2 md:bottom-8 md:-left-12"
            />
            <StatBubble
              icon={Users}
              label="Graduates"
              value="180+"
              className="right-0 top-12 md:top-16"
            />
            <SocialIcon icon={Facebook} className="left-1/4 top-0 md:-top-4" />
            <SocialIcon icon={Youtube} className="left-[-10%] top-1/3 md:left-[-5%]" />
            <SocialIcon icon={Twitter} className="right-[-10%] bottom-1/4 md:right-[-5%]" />
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Why Choose Us Section ---

function WhyChooseUsSection() {
  return (
    <section className="container mx-auto space-y-8 px-4 md:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="font-headline text-3xl font-bold sm:text-4xl">
          Why Choose Kanakkmash?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          We're dedicated to providing the best learning experience with a
          focus on results and student satisfaction.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}

// --- Mentor Section ---

function MentorSection({ founderImage }: { founderImage?: ImagePlaceholder }) {
    return (
        <section className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          <div className="space-y-6 text-center md:text-left">
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
            <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                <Badge>BSc Maths</Badge>
                <Badge>DElEd</Badge>
                <Badge>KTET Certified</Badge>
                <Badge>5+ Years Experience</Badge>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute z-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative mx-auto aspect-square h-[300px] w-[300px] md:h-[400px] md:w-[400px]">
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
        </section>
    );
}

// --- Services Section ---

type Service = {
    title: string;
    text: string;
    image?: ImagePlaceholder;
}

function ServicesSection({ services }: { services: Service[] }) {
    return (
        <section className="container mx-auto space-y-8 px-4 md:px-6 lg:px-8">
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
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
    );
}


const FloatingSymbol = ({ symbol, className, duration, delay }: { symbol: string; className: string, duration: number, delay: number }) => (
    <div
      className={`absolute text-5xl font-bold text-primary/20 -z-10 ${className}`}
      style={{
        animation: `float-down ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      {symbol}
    </div>
);

export default function AboutUsPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'about-hero-woman');
  const founderImage = PlaceHolderImages.find((img) => img.id === 'fida-shirin');
  const service1Image = PlaceHolderImages.find((img) => img.id === 'about-service-1');
  const service2Image = PlaceHolderImages.find((img) => img.id === 'about-service-2');
  const service3Image = PlaceHolderImages.find((img) => img.id === 'about-service-3');

  const services = [
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
  ];

  const symbols = [
    { symbol: '+', className: 'top-[20%] left-[10%] text-7xl', duration: 8, delay: 0 },
    { symbol: '−', className: 'top-[50%] right-[12%] text-6xl', duration: 10, delay: 2 },
    { symbol: '×', className: 'bottom-[25%] left-[20%]', duration: 9, delay: 1 },
    { symbol: '÷', className: 'top-[15%] right-[25%] text-4xl', duration: 12, delay: 3 },
    { symbol: '∫', className: 'bottom-[15%] right-[15%]', duration: 7, delay: 0.5 },
    { symbol: '√', className: 'top-[70%] left-[15%] text-6xl', duration: 11, delay: 2.5 },
    { symbol: 'π', className: 'top-[10%] left-[40%]', duration: 9, delay: 1.5 },
    { symbol: 'Σ', className: 'bottom-[5%] left-[50%]', duration: 13, delay: 4 },
  ];

  return (
    <div className="space-y-16 md:space-y-24 lg:space-y-32 relative overflow-hidden">
       <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
      >
        <div className="hidden md:block">
            {symbols.map((s, i) => (
                <FloatingSymbol key={i} {...s} />
            ))}
        </div>
      </div>
      
      <Reveal>
        <HeroSection heroImage={heroImage} />
      </Reveal>

      <Reveal>
        <WhyChooseUsSection />
      </Reveal>

      <Reveal>
        <MentorSection founderImage={founderImage} />
      </Reveal>
      
      <Reveal>
        <ServicesSection services={services.filter(s => s.image)} />
      </Reveal>
    </div>
  );
}
