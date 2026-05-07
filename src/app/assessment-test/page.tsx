'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc, orderBy, where, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import Image from 'next/image';
import { ArrowLeft, Clock, BookOpen, CheckCircle, Trophy, Sparkles, Loader2, Award, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserData {
  name: string;
  email: string;
  whatsapp: string;
  class: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
  durationSeconds?: number;
}

// Fallback if Firestore is empty
const FALLBACK_QUESTIONS: Question[] = [
  { id: '1', question: 'What is the value of 15 × 12?', options: ['160', '180', '175', '190'], correctAnswerIndex: 1 },
  { id: '2', question: 'Simplify: √144', options: ['11', '12', '13', '14'], correctAnswerIndex: 1 },
  { id: '3', question: 'What is 25% of 200?', options: ['40', '45', '50', '55'], correctAnswerIndex: 2 },
  { id: '4', question: 'Solve: 3x + 6 = 18. What is x?', options: ['2', '3', '4', '6'], correctAnswerIndex: 2 },
  { id: '5', question: 'Area of circle with radius 7? (π=22/7)', options: ['144 sq u', '154 sq u', '164 sq u', '174 sq u'], correctAnswerIndex: 1 },
];

export default function AssessmentTestPage() {
  const { firestore } = useFirebase();
  const { user: authUser } = useUser();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(5 * 60);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Load user and check for invoiceId
  useEffect(() => {
    const raw = sessionStorage.getItem('assessmentUser');
    if (raw) setUser(JSON.parse(raw));

    const params = new URLSearchParams(window.location.search);
    setInvoiceId(params.get('invoiceId'));
  }, []);

  // Fetch questions + config from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) { setFetchingConfig(false); return; }
      try {
        // Get student's class from sessionStorage (set on assessment form page)
        const raw = sessionStorage.getItem('assessmentUser');
        const studentClass = raw ? JSON.parse(raw).class : '';

        // Fetch questions filtered by the student's category
        const qSnap = await getDocs(
          query(
            collection(firestore, 'pre_assessment_questions'),
            where('class', '==', studentClass)
          )
        );
        const fetched: Question[] = qSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .sort((a, b) => {
             const timeA = a.createdAt?.toMillis() || 0;
             const timeB = b.createdAt?.toMillis() || 0;
             return timeA - timeB;
          });
        
        if (fetched.length === 0) {
          // If no questions found for this specific class/level
          setQuestions([]);
        } else {
          setQuestions(fetched);
          setAnswers(Array(fetched.length).fill(null));
          
          // Determine total duration
          // If questions have individual durations, sum them up. 
          // Otherwise, fall back to global config.
          const summedSeconds = fetched.reduce((acc, q) => acc + (Number(q.durationSeconds) || 0), 0);
          
          if (summedSeconds > 0) {
            setDurationSeconds(summedSeconds);
            setTimeLeft(summedSeconds);
          } else {
            // Config — duration fallback
            const cfgSnap = await getDoc(doc(firestore, 'pre_assessment_config', 'settings'));
            const duration = cfgSnap.exists() ? (cfgSnap.data().durationMinutes ?? 5) : 5;
            setDurationSeconds(duration * 60);
            setTimeLeft(duration * 60);
          }
        }
      } catch (error) {
        console.error("Error fetching assessment questions:", error);
        setQuestions(FALLBACK_QUESTIONS);
        setAnswers(Array(FALLBACK_QUESTIONS.length).fill(null));
        setTimeLeft(5 * 60);
      } finally {
        setFetchingConfig(false);
      }
    };
    fetchData();
  }, [firestore, invoiceId, router]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { clearInterval(timer); setSubmitted(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  // Save report to Firestore
  useEffect(() => {
    if (submitted && user && firestore && !reportSaved) {
      setReportSaved(true);
      const saveReport = async () => {
        try {
          const finalScore = questions.length > 0
            ? answers.filter((a, i) => a === questions[i]?.correctAnswerIndex).length
            : 0;
          const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
          
          await addDoc(collection(firestore, 'pre_assessment'), {
            // Fields at root for easier querying & reconciliation
            name: user.name,
            email: user.email.toLowerCase(),
            whatsapp: user.whatsapp.replace(/[^\d+]/g, ''),
            class: user.class,
            // Original structure preserved for compatibility if needed
            user: {
              name: user.name,
              email: user.email.toLowerCase(),
              whatsapp: user.whatsapp,
              class: user.class
            },
            score: finalScore,
            totalQuestions: questions.length,
            percentage: Math.round(percentage),
            answers: answers,
            submittedAt: serverTimestamp(),
            // Reconciliation fields matching registration logic
            isLoggedIn: !!authUser,
            isLogged: !!authUser,
            userId: authUser?.id || null,
            userEmail: authUser?.email ? authUser.email.toLowerCase() : null,
            invoiceId: invoiceId || null,
            assessmentType: invoiceId ? 'paid' : 'free',
            status: 'completed'
          });
        } catch (error) {
          console.error("Error saving assessment report:", error);
        }
      };
      saveReport();
    }
  }, [submitted, user, firestore, reportSaved, questions, answers, authUser]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleSelect = (idx: number) => {
    if (submitted) return;
    setSelected(idx);
    const updated = [...answers];
    updated[currentQ] = idx;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(answers[currentQ + 1]);
    } else {
      setSubmitted(true);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelected(answers[currentQ - 1]);
    }
  };

  const score = questions.length > 0
    ? answers.filter((a, i) => a === questions[i]?.correctAnswerIndex).length
    : 0;

  if (fetchingConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading assessment…</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative">
        <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.06)_1px,transparent_1px)] [background-size:8px_8px] -z-10" />
        <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />

        <div className="bg-card border border-border rounded-3xl p-8 shadow-lg w-full max-w-md text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-orange-400 shadow-xl shadow-primary/20 mb-6"
          >
            <Trophy size={48} className="text-white" />
          </motion.div>
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-foreground font-headline mb-2"
          >
            Pre Assessment Completed!
          </motion.h2>
          {user && (
            <p className="text-muted-foreground text-sm mb-6">
              Great effort, <span className="text-foreground font-semibold">{user.name}</span>!
            </p>
          )}

          <div className="bg-secondary rounded-2xl p-6 mb-6 border border-border">
            <p className="text-muted-foreground text-sm mb-1">Your Score</p>
            <p className="text-5xl font-bold text-foreground">
              {score}<span className="text-2xl text-muted-foreground">/{questions.length}</span>
            </p>
            <p className="text-primary font-semibold mt-1">{percentage}%</p>
            <div className="w-full bg-border rounded-full h-2 mt-4">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#F97316] to-[#F59E0B] transition-all duration-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-sm mb-6">
            {percentage >= 80 ? '🌟 Excellent! You have a strong grasp of the concepts.'
              : percentage >= 50 ? '👍 Good effort! Keep practising to improve further.'
              : '📚 Keep it up! Regular practice will help you improve.'}
          </p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3"
          >
            <Link href={invoiceId ? `/invoice/${invoiceId}?success=true` : "/"} className="flex-1 py-3.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-sm font-medium flex items-center justify-center">
              {invoiceId ? 'Skip test' : 'Back to Home'}
            </Link>
            <Link 
              href={invoiceId ? `/invoice/${invoiceId}?success=true` : "/sign-up"} 
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all text-sm shadow-md flex items-center justify-center gap-2"
            >
              {invoiceId ? 'Get Invoice' : 'Enroll Now'}
              <ChevronRight size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.06)_1px,transparent_1px)] [background-size:8px_8px] -z-10" />
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-accent/10 rounded-full blur-3xl -z-10" />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold font-headline flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Award size={18} className="text-primary" />
              </span>
              Pre Assessment
            </h1>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm border shadow-sm transition-all duration-300 ${
            (timeLeft ?? 0) < 60
              ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse'
              : 'bg-card text-foreground border-border'
          }`}>
            <Clock size={14} className={(timeLeft ?? 0) < 60 ? "animate-spin-slow" : ""} />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>

        {/* User info strip */}
        {user && (
          <div className="bg-card border border-border rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#F59E0B] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">{user.name}</p>
              <p className="text-muted-foreground text-xs">{user.class}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-muted-foreground text-xs">
              <BookOpen size={12} />
              <span>{questions.length} Questions · {Math.round(durationSeconds / 60)} min</span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-border rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full"
            />
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          {questions.length > 0 ? (
            <motion.div
              key={currentQ}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-xl mb-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    Question {currentQ + 1}
                  </span>
                  <Sparkles size={14} className="text-orange-400" />
                </div>
                {answers[currentQ] !== null && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success">
                    <CheckCircle size={14} />
                    Answered
                  </div>
                )}
              </div>

              {q?.imageUrl && (
                <div className="relative w-full aspect-video max-w-sm mx-auto rounded-2xl overflow-hidden border-4 border-muted bg-muted/20 mb-8 shadow-inner">
                  <Image src={q.imageUrl} alt="Question image" fill className="object-contain" unoptimized />
                </div>
              )}

              <h2 className="text-foreground font-bold text-xl leading-snug mb-8">{q?.question}</h2>

              <div className="grid gap-3">
                {q?.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`group w-full text-left px-6 py-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                      selected === idx
                        ? 'bg-primary/10 border-primary text-foreground shadow-md ring-4 ring-primary/5'
                        : 'bg-card border-border text-foreground/70 hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-sm font-black transition-all ${
                      selected === idx 
                        ? 'border-primary bg-primary text-white scale-110' 
                        : 'border-border text-muted-foreground group-hover:border-primary/40'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-medium">{opt}</span>
                    {selected === idx && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-3xl p-10 shadow-md mb-4 text-center space-y-6"
            >
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <BookOpen size={24} className="text-muted-foreground" />
             </div>
             <div>
                <h3 className="text-xl font-bold">No questions available</h3>
                <p className="text-muted-foreground text-sm mt-2">
                   We haven't added assessment questions for the category <b>"{user?.class}"</b> yet.
                </p>
             </div>
             <Link 
               href={invoiceId ? `/invoice/${invoiceId}?success=true` : "/sign-up"} 
               className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#F59E0B] text-white font-bold text-sm"
             >
                {invoiceId ? 'Skip and View My Invoice' : 'Proceed to Enrollment'}
             </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {questions.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentQ === 0}
              className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#F59E0B] text-white font-bold hover:from-[#ea6c0a] hover:to-[#e08f08] transition-all text-sm flex items-center justify-center gap-2 shadow-md"
            >
              {currentQ === questions.length - 1 ? <><CheckCircle size={16} /> Submit</> : <>Next →</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
