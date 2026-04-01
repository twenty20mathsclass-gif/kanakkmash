'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, orderBy, where, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Image from 'next/image';
import { ArrowLeft, Clock, BookOpen, CheckCircle, Trophy, Sparkles, Loader2 } from 'lucide-react';

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

  // Load user from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('assessmentUser');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  // Fetch questions + config from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) { setFetchingConfig(false); return; }
      try {
        // Get student's class from sessionStorage (set on assessment form page)
        const raw = sessionStorage.getItem('assessmentUser');
        const studentClass = raw ? JSON.parse(raw).class : '';

        // Fetch questions filtered by the student's class
        const qSnap = await getDocs(
          query(
            collection(firestore, 'assessment_questions'),
            where('class', '==', studentClass),
            orderBy('createdAt', 'asc')
          )
        );
        const fetched: Question[] = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        const qs = fetched.length > 0 ? fetched : FALLBACK_QUESTIONS;
        setQuestions(qs);
        setAnswers(Array(qs.length).fill(null));

        // Config — duration
        const cfgSnap = await getDoc(doc(firestore, 'assessment_config', 'settings'));
        const duration = cfgSnap.exists() ? (cfgSnap.data().durationMinutes ?? 5) : 5;
        setDurationSeconds(duration * 60);
        setTimeLeft(duration * 60);
      } catch {
        setQuestions(FALLBACK_QUESTIONS);
        setAnswers(Array(FALLBACK_QUESTIONS.length).fill(null));
        setTimeLeft(5 * 60);
      } finally {
        setFetchingConfig(false);
      }
    };
    fetchData();
  }, [firestore]);

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
          
          await addDoc(collection(firestore, 'assessment'), {
            user: {
              name: user.name,
              email: user.email,
              whatsapp: user.whatsapp,
              class: user.class
            },
            score: finalScore,
            totalQuestions: questions.length,
            percentage: Math.round(percentage),
            answers: answers,
            submittedAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Error saving assessment report:", error);
        }
      };
      saveReport();
    }
  }, [submitted, user, firestore, reportSaved, questions, answers]);

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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#F59E0B] shadow-md mb-4">
            <Trophy size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-headline mb-1">Test Completed!</h2>
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

          <div className="flex gap-3">
            <Link href="/" className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-sm font-medium">
              Back to Home
            </Link>
            <Link href="/sign-up" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#F59E0B] text-white font-bold hover:from-[#ea6c0a] hover:to-[#e08f08] transition-all text-sm shadow-md">
              Enroll Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="min-h-screen bg-background px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-background bg-[radial-gradient(hsl(var(--primary)/.06)_1px,transparent_1px)] [background-size:8px_8px] -z-10" />
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-accent/10 rounded-full blur-3xl -z-10" />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Exit
          </Link>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm border ${
            (timeLeft ?? 0) < 60
              ? 'bg-destructive/10 text-destructive border-destructive/30'
              : 'bg-secondary text-foreground border-border'
          }`}>
            <Clock size={14} />
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
        <div className="flex gap-1.5 mb-6">
          {questions.map((_, i) => (
            <div
              key={i}
              onClick={() => { setCurrentQ(i); setSelected(answers[i]); }}
              className={`flex-1 h-1.5 rounded-full cursor-pointer transition-all ${
                i === currentQ ? 'bg-primary' : answers[i] !== null ? 'bg-primary/40' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Question card */}
        {q && (
          <div className="bg-card border border-border rounded-3xl p-7 shadow-md mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                Q{currentQ + 1} of {questions.length}
              </span>
              <Sparkles size={14} className="text-accent" />
            </div>
            {q.imageUrl && (
              <div className="relative w-full max-w-sm h-44 mx-auto rounded-xl overflow-hidden border border-border bg-muted/20 mb-4">
                <Image src={q.imageUrl} alt="Question image" fill className="object-contain" unoptimized />
              </div>
            )}
            <h2 className="text-foreground font-semibold text-lg leading-relaxed mb-6">{q.question}</h2>

            <div className="space-y-3">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-3 ${
                    selected === idx
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-background border-border text-foreground/70 hover:bg-secondary hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    selected === idx ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
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
      </div>
    </div>
  );
}
