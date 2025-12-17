import React, { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Briefcase, CreditCard, ShieldCheck, BookOpen, Bot, Settings, LogOut, Loader, WifiOff, CheckCircle,
  ArrowRight, Menu, Battery, Signal, Trash2, Lock, Mail, PlusCircle, ArrowLeft, Send, XCircle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Dexie, { type Table } from 'dexie';
import { useGesture } from '@use-gesture/react';
import { v4 as uuidv4 } from 'uuid';
import { hashText } from '@/lib/fast-hash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useEmblaCarousel from 'embla-carousel-react';
import type { User, Session, Task, Payment, ComplianceLog, TrainingModule, AiMessage, OutboxItem } from '@shared/types';
// --- Constants and Types ---
const BIO_GREEN = '#2E7D32';
const OLED_BLACK = '#0f0f0f';
// --- Database Definition ---
class SuiteWasteDB extends Dexie {
  users!: Table<User, string>;
  sessions!: Table<Session, string>;
  tasks!: Table<Task, string>;
  payments!: Table<Payment, string>;
  complianceLogs!: Table<ComplianceLog, string>;
  trainingModules!: Table<TrainingModule, string>;
  aiMessages!: Table<AiMessage, string>;
  outbox!: Table<OutboxItem, string>;
  constructor() {
    super('SuiteWasteDB');
    this.version(5).stores({
      users: 'id, &email, role',
      sessions: 'id, userId, createdAt',
      tasks: 'id, status, assignedTo, dueDate',
      payments: 'id, status, date',
      complianceLogs: 'id, compliant, timestamp',
      trainingModules: 'id, completed',
      aiMessages: 'id, timestamp',
      outbox: 'id, timestamp',
    });
  }
  async seedIfEmpty() {
    const userCount = await this.users.count();
    if (userCount > 0) return;
    console.log("Database is empty, seeding demo data...");
    const demoUsers: Omit<User, 'id' | 'passwordHash'>[] = [
      { email: 'field@suitewaste.os', name: 'Field Operator', role: 'Field Operator', permissions: ['operations', 'training'] },
      { email: 'manager@suitewaste.os', name: 'Operations Manager', role: 'Operations Manager', permissions: ['operations', 'payments', 'compliance', 'training', 'ai'] },
      { email: 'auditor@suitewaste.os', name: 'Compliance Officer', role: 'Compliance/Audit Officer', permissions: ['compliance', 'training'] },
      { email: 'executive@suitewaste.os', name: 'Executive', role: 'Executive', permissions: ['payments', 'compliance', 'ai'] },
      { email: 'trainer@suitewaste.os', name: 'Training Officer', role: 'Training Officer', permissions: ['training', 'ai'] },
    ];
    const passwordHash = await hashText('Auditor123');
await this.transaction('rw', this.users, async () => {
  for (const u of demoUsers) {
    try {
      await this.users.put({ id: uuidv4(), passwordHash, ...u });
    } catch (e) {
      if ((e as any)?.name === 'ConstraintError') {
        console.log(`Skipping demo user ${u.email}: already exists`);
        continue;
      }
      throw e;
    }
  }
});
    const manager = await this.users.where({ role: 'Operations Manager' }).first();
    if (!manager) return;
    await this.transaction('rw', this.tasks, this.payments, this.complianceLogs, this.trainingModules, this.aiMessages, async () => {
        if (await this.tasks.count() === 0) {
            const tasksToSeed: Omit<Task, 'id'>[] = Array.from({ length: 20 }, (_, i) => ({ title: `Task #${i + 1}: Collect from Client ${String.fromCharCode(65 + (i % 10))}`, status: i % 3 === 0 ? 'completed' : 'pending', assignedTo: manager.id, dueDate: Date.now() + (i - 10) * 24 * 60 * 60 * 1000, }));
            await this.tasks.bulkAdd(tasksToSeed.map(t => ({...t, id: uuidv4()})));
        }
        if (await this.payments.count() === 0) {
            const paymentsToSeed: Omit<Payment, 'id'>[] = Array.from({ length: 15 }, (_, i) => ({ amount: Math.floor(Math.random() * 5000) + 1000, status: i % 4 === 0 ? 'due' : 'paid', client: `Client Corp ${String.fromCharCode(65 + (i % 10))}`, date: Date.now() - i * 7 * 24 * 60 * 60 * 1000, }));
            await this.payments.bulkAdd(paymentsToSeed.map(p => ({...p, id: uuidv4()})));
        }
        if (await this.complianceLogs.count() === 0) {
            const logsToSeed: Omit<ComplianceLog, 'id'>[] = Array.from({ length: 25 }, (_, i) => ({ description: `Log entry for site visit ${i + 1}. Checked safety protocols.`, compliant: Math.random() > 0.2, timestamp: Date.now() - i * 3 * 24 * 60 * 60 * 1000, }));
            await this.complianceLogs.bulkAdd(logsToSeed.map(l => ({...l, id: uuidv4()})));
        }
        if (await this.trainingModules.count() === 0) {
            const modulesToSeed: Omit<TrainingModule, 'id'>[] = [ { title: 'Safety Protocols 101', content: '...', completed: true }, { title: 'Waste Handling Procedures', content: '...', completed: true }, { title: 'Emergency Response', content: '...', completed: false }, { title: 'Client Communication', content: '...', completed: false }, ];
            await this.trainingModules.bulkAdd(modulesToSeed.map(m => ({...m, id: uuidv4()})));
        }
        if (await this.aiMessages.count() === 0) {
            const messagesToSeed: Omit<AiMessage, 'id'>[] = [ { role: 'ai', content: 'Welcome to AI Assist. How can I help you optimize operations today?', timestamp: Date.now() - 10000 }, ];
            await this.aiMessages.bulkAdd(messagesToSeed.map(m => ({...m, id: uuidv4()})));
        }
    });
    toast.success("Demo data seeded successfully.");
  }
  async signIn(email: string, password: string): Promise<User | null> {
    const user = await this.users.where({ email }).first();
    if (!user || !user.passwordHash) return null;
    const inputHash = await hashText(password);
    if (inputHash === user.passwordHash) {
      await this.sessions.clear();
      await this.sessions.add({ id: uuidv4(), userId: user.id, createdAt: Date.now() });
      return user;
    }
    return null;
  }
  async signOut() { await this.sessions.clear(); }
  async getCurrentUser(): Promise<User | null> {
    const session = await this.sessions.orderBy('createdAt').last();
    if (!session) return null;
    return this.users.get(session.userId) ?? null;
  }
}
const db = new SuiteWasteDB();
// --- Sync Service ---
const endpointMap: Record<string, string> = {
    tasks: 'tasks',
    payments: 'payments',
    complianceLogs: 'compliancelogs',
    trainingModules: 'trainingmodules',
    aiMessages: 'aimessages',
};
async function syncWithBackend(table: string, action: 'create' | 'update' | 'delete', payload: any) {
    const endpoint = endpointMap[table];
    if (!endpoint) return;
    const url = action === 'create' ? `/api/${endpoint}` : `/api/${endpoint}/${payload.id}`;
    const method = action === 'create' ? 'POST' : action === 'update' ? 'PATCH' : 'DELETE';
    if (navigator.onLine) {
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: action !== 'delete' ? JSON.stringify(payload) : undefined,
            });
            if (!response.ok) throw new Error('Network response was not ok.');
        } catch (error) {
            console.error('Sync failed, queueing to outbox:', error);
            await db.outbox.add({ id: uuidv4(), table, action, payload, timestamp: Date.now() });
            toast.warning('Network issue. Change saved locally.');
        }
    } else {
        await db.outbox.add({ id: uuidv4(), table, action, payload, timestamp: Date.now() });
        toast.info('Offline. Change saved locally.');
    }
}
// --- Service Worker ---
const swCode = `
  const CACHE_NAME = 'suitewaste-os-cache-v5';
  const APP_SHELL_URLS = ['/', '/index.html'];
  self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_URLS))); });
  self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || new Response(JSON.stringify({ success: false, error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
          });
        })
      );
    } else {
      event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
    }
  });
`;
// --- Custom Hooks ---
function usePollingQuery<T>(queryFn: () => Promise<T[]>, intervalMs = 1000) {
  const [data, setData] = useState<T[]>([]);
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);
  const stableQueryFn = useCallback(() => {
    return queryFnRef.current();
  }, []);
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const result = await stableQueryFn();
        if (isMounted) setData(result);
      } catch (error) {
        console.error("Polling query failed:", error);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, intervalMs);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [stableQueryFn, intervalMs]);
  return data;
}
// --- Error Boundary ---
class DashboardErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback: React.ReactNode }>, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren<{ fallback: React.ReactNode }>) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error("Dashboard Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) { return this.props.fallback; }
    return this.props.children;
  }
}
// --- Inlined Components ---
const SuiteIcon = forwardRef<HTMLButtonElement, { icon: React.ElementType; label: string; className?: string; iconClassName?: string; onClick?: () => void }>(
  ({ icon: Icon, label, className, iconClassName, onClick }, ref) => (
    <motion.button
      ref={ref}
      onClick={onClick}
      className={cn("flex flex-col items-center justify-center text-center space-y-2 w-20 h-20 rounded-3xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-green-400", className)}
      variants={{
        hover: { scale: 1.1, filter: `drop-shadow(0 0 15px ${BIO_GREEN}A0)` },
        tap: { scale: 0.95, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }
      }}
      whileHover="hover"
      whileTap="tap"
    >
      <Icon className={cn("w-8 h-8 text-white", iconClassName)} />
      <span className="text-xs font-medium text-white/90 tracking-tight text-[clamp(0.75rem,2vw,0.875rem)]">{label}</span>
    </motion.button>
  )
);
SuiteIcon.displayName = 'SuiteIcon';
// --- Main App Component ---
export function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const checkSession = useCallback(async () => {
    try {
      await db.open();
      await db.seedIfEmpty();
      const user = await db.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Session check failed:", error);
      toast.error("Failed to initialize session.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swBlob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl)
        .then(reg => console.log('SW registered from Blob: ', reg))
        .catch(err => console.log('SW registration failed: ', err));
    }
    checkSession();
  }, [checkSession]);
  const handleLoginSuccess = (user: User) => setCurrentUser(user);
  const handleLogout = async () => {
    await db.signOut();
    setCurrentUser(null);
    toast.success("You have been logged out.");
  };
  if (isLoading) return <LoadingScreen />;
  return (
    <div className="bg-black text-white min-h-screen font-sans antialiased" style={{ backgroundColor: OLED_BLACK }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <AnimatePresence mode="wait">
            {currentUser ? (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SuiteWasteOS user={currentUser} onLogout={handleLogout} />
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Toaster theme="dark" richColors position="top-center" />
    </div>
  );
}
// --- Loading & Login Screens ---
const LoadingScreen = () => (
  <div style={{ backgroundColor: OLED_BLACK }} className="w-full h-screen flex flex-col items-center justify-center gap-4">
    <img src="https://i.imgur.com/Jt5g2S6.png" alt="SuiteWaste Logo" className="w-24 h-24 animate-pulse" />
    <Loader className="text-white/80 animate-spin" />
    <p className="text-white/60 text-[clamp(1rem,4vw,1.125rem)]">Initializing SuiteWaste OS...</p>
  </div>
);
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
      const user = await db.signIn(values.email, values.password);
      if (user) {
        toast.success(`Welcome back, ${user.role}!`);
        onLoginSuccess(user);
      } else {
        toast.error("Invalid email or password.");
        form.setError("password", { type: "manual", message: "Invalid credentials" });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div
      style={{ background: `linear-gradient(135deg, ${BIO_GREEN} 0%, #1B5E20 100%)` }}
      className="min-h-screen flex flex-col items-center justify-center p-4 -m-8 md:-m-10 lg:-m-12"
    >
      <div className="w-full max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
          <img src="https://i.imgur.com/Jt5g2S6.png" alt="SuiteWaste Logo" className="w-32 h-32 mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 15px rgba(46, 125, 50, 0.8))' }} />
          <h1 className="text-4xl font-bold text-white">SuiteWaste OS</h1>
          <p className="text-lg text-gray-300 text-[clamp(1rem,4vw,1.125rem)]">Edge-Optimized Waste Management</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-black/30 backdrop-blur-[24px] border border-white/20 rounded-[2.5rem] p-8 md:p-10 shadow-[0_35px_70px_rgba(0,0,0,0.6)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 uppercase text-xs font-bold">Work Email</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 w-5 h-5 text-green-300" />
                      <Input type="email" placeholder="manager@suitewaste.os" className="bg-black/20 border border-white/10 text-white placeholder:text-gray-400 rounded-xl pl-10 pr-4 py-3 h-12 text-[clamp(1rem,4vw,1.125rem)]" {...field} />
                    </div>
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-200 uppercase text-xs font-bold">Password</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-5 h-5 text-green-300" />
                      <Input type="password" placeholder="••••••••" className="bg-black/20 border border-white/10 text-white placeholder:text-gray-400 rounded-xl pl-10 pr-4 py-3 h-12 text-[clamp(1rem,4vw,1.125rem)]" {...field} />
                    </div>
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" className="border-white/50 data-[state=checked]:bg-green-500 data-[state=checked]:text-white" />
                  <label htmlFor="remember-me" className="text-gray-200 text-[clamp(0.875rem,3vw,1rem)]">Remember me</label>
                </div>
                <a href="#" className="text-green-300 hover:text-white transition text-[clamp(0.875rem,3vw,1rem)]">Reset password?</a>
              </div>
              <Button type="submit" className="w-full bg-white text-green-900 font-bold py-4 h-14 text-base rounded-xl transition-all duration-300 hover:scale-105 active:scale-100 flex items-center justify-center text-[clamp(1rem,4vw,1.125rem)]" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="animate-spin" /> : <><ArrowRight className="mr-2 h-5 w-5" /> Secure Sign In</>}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
};
// --- Main OS Interface & State Management ---
type SuiteKey = 'operations' | 'payments' | 'compliance' | 'training' | 'ai';
const SUITES: { key: SuiteKey; label: string; icon: React.ElementType; permissions: string[] }[] = [
  { key: 'operations', label: 'Routes & Tasks', icon: Briefcase, permissions: ['operations'] },
  { key: 'payments', label: 'Finance Center', icon: CreditCard, permissions: ['payments'] },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck, permissions: ['compliance'] },
  { key: 'training', label: 'Training Hub', icon: BookOpen, permissions: ['training'] },
  { key: 'ai', label: 'AI Assist', icon: Bot, permissions: ['ai'] },
];
const SuiteWasteOS = ({ user, onLogout }: { user: User; onLogout: () => void; }) => {
  const [activeSuite, setActiveSuite] = useState<SuiteKey | null>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  const bindSuiteGesture = useGesture({
    onDrag: ({ active, movement: [mx], velocity: [vx], touches }) => {
      if (active && touches >= 2 && Math.abs(mx) > 50 && Math.abs(vx) > 0.5) {
        if (!isSwitcherOpen) openSwitcher();
      }
    },
  }, { pointer: { touches: true } });
  const availableSuites = useMemo(() =>
    SUITES.filter(suite => suite.permissions.some(p => user.permissions.includes(p))),
    [user.permissions]
  );
  const handleSuiteSelect = (suite: SuiteKey) => {
    setActiveSuite(suite);
    closeSwitcher();
  };
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] lg:h-[calc(100vh-6rem)] max-w-lg mx-auto flex flex-col bg-black/80 rounded-[2.5rem] shadow-[0_35px_70px_rgba(0,0,0,0.6)] overflow-hidden border border-white/20" {...bindSuiteGesture()}>
      <StatusBar />
      <div className="flex-grow overflow-y-auto p-1 sm:p-2 lg:p-4">
        <AnimatePresence mode="wait">
          {activeSuite ? (
            <motion.div key={activeSuite} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <DashboardView suiteKey={activeSuite} onBack={() => setActiveSuite(null)} />
            </motion.div>
          ) : (
            <motion.div key="homescreen" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Homescreen user={user} availableSuites={availableSuites} onSuiteSelect={handleSuiteSelect} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Dock onSwitcherOpen={openSwitcher} onLogout={onLogout} />
      <SuiteSwitcher isOpen={isSwitcherOpen} onClose={closeSwitcher} availableSuites={availableSuites} onSuiteSelect={handleSuiteSelect} />
    </div>
  );
};
const StatusBar = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="w-full px-4 py-1 flex justify-between items-center text-xs font-medium text-neutral-300 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="flex items-center gap-2">
        <Signal size={14} />
        <WifiOff size={14} />
        <span className="flex items-center gap-1">100% <Battery size={14} /></span>
      </div>
    </div>
  );
};
const Homescreen = ({ user, availableSuites, onSuiteSelect }: { user: User; availableSuites: typeof SUITES; onSuiteSelect: (key: SuiteKey) => void; }) => (
  <div className="py-8">
    <motion.h2
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-3xl font-bold text-center mb-10 text-white text-[clamp(1.5rem,5vw,2rem)]"
    >
      Welcome, {user.role}
    </motion.h2>
    <motion.div
      className="grid grid-cols-3 sm:grid-cols-4 gap-y-8 gap-x-4 justify-items-center"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      initial="hidden"
      animate="visible"
    >
      {availableSuites.map(suite => (
        <motion.div key={suite.key} variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}>
          <SuiteIcon icon={suite.icon} label={suite.label} onClick={() => onSuiteSelect(suite.key)} className="bg-white/5 hover:bg-white/10 border-white/10" />
        </motion.div>
      ))}
    </motion.div>
  </div>
);
const Dock = ({ onSwitcherOpen, onLogout }: { onSwitcherOpen: () => void; onLogout: () => void; }) => (
  <div className="w-full p-2">
    <div className="bg-black/20 border border-white/20 backdrop-blur-[20px] rounded-full flex justify-around items-center h-16">
      <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white" onClick={onSwitcherOpen}><Menu /></Button>
      <SettingsSheet onLogout={onLogout} />
    </div>
  </div>
);
const SuiteSwitcher = ({ isOpen, onClose, availableSuites, onSuiteSelect }: { isOpen: boolean; onClose: () => void; availableSuites: typeof SUITES; onSuiteSelect: (key: SuiteKey) => void; }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-md p-4 flex justify-center items-center gap-4"
          onClick={e => e.stopPropagation()}
          style={{ perspective: 1000 }}
        >
          {availableSuites.map((suite, index) => (
            <motion.div key={suite.key}
              initial={{ opacity: 0, y: 20, rotateY: -30 }}
              animate={{ opacity: 1, y: 0, rotateY: 0, transition: { delay: index * 0.08 } }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <SuiteIcon icon={suite.icon} label={suite.label} onClick={() => onSuiteSelect(suite.key)} className="w-24 h-24 md:w-28 md:h-28 bg-white/10 hover:bg-white/20 border-white/10" iconClassName="w-12 h-12 md:w-14 md:h-14" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
// --- Dashboards ---
const DashboardView = ({ suiteKey, onBack }: { suiteKey: SuiteKey; onBack: () => void; }) => {
  const suite = SUITES.find(s => s.key === suiteKey);
  if (!suite) return <div>Suite not found</div>;
  const Icon = suite.icon;
  const renderContent = () => {
    switch (suiteKey) {
      case 'operations': return <OperationsDashboard />;
      case 'payments': return <PaymentsDashboard />;
      case 'compliance': return <ComplianceDashboard />;
      case 'training': return <TrainingDashboard />;
      case 'ai': return <AiDashboard />;
      default: return <p className="text-[clamp(1rem,4vw,1.125rem)]">Dashboard coming soon.</p>;
    }
  };
  return (
    <Card className="bg-black/20 border border-white/20 backdrop-blur-[24px] text-white rounded-[2.5rem] p-4 md:p-6 shadow-[0_35px_70px_rgba(0,0,0,0.6)] h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"><ArrowLeft /></Button>
          <Icon className="w-8 h-8" style={{ color: BIO_GREEN }} />
          <CardTitle className="text-2xl font-bold text-[clamp(1.25rem,5vw,1.5rem)]">{suite.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-neutral-300 p-0 flex-grow overflow-y-auto">
        <DashboardErrorBoundary fallback={<Card className="p-4 bg-red-900/50 border-red-500/50"><p>Error in {suite.label}.</p><Button onClick={onBack}>Back</Button></Card>}>
          {renderContent()}
        </DashboardErrorBoundary>
      </CardContent>
    </Card>
  );
};
const OperationsDashboard = () => {
    const tasks = usePollingQuery(() => db.tasks.orderBy('dueDate').toArray());
    const nodes = useMemo<Node[]>(() => tasks?.map((task, i) => ({
        id: task.id,
        position: { x: (i % 3) * 200, y: Math.floor(i / 3) * 120 },
        data: { label: `${task.title} (${task.status})` },
        style: { background: task.status === 'completed' ? '#2E7D32' : '#4a4a4a', color: 'white', border: 'none', borderRadius: '8px' }
    })) ?? [], [tasks]);
    const edges = useMemo<Edge[]>(() => (tasks?.length ?? 0) > 1 ? tasks.slice(1).map((_, i) => ({ id: `e${i}-${i+1}`, source: tasks[i].id, target: tasks[i+1].id, animated: true })) : [], [tasks]);
    const toggleTaskStatus = async (taskId?: string) => {
        if (!taskId) return;
        const task = await db.tasks.get(taskId);
        if (task) {
            const newStatus = task.status === 'pending' ? 'completed' : 'pending';
            const updatedTask = { ...task, status: newStatus };
            await db.tasks.update(taskId, { status: newStatus });
            await syncWithBackend('tasks', 'update', updatedTask);
        }
    };
    return (
        <div className="h-full w-full rounded-lg overflow-hidden">
            <ReactFlow nodes={nodes} edges={edges} onNodeDoubleClick={(_, node) => toggleTaskStatus(node?.id)} fitView>
                <Background color="#444" />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
};
const PaymentsDashboard = () => {
    const payments = usePollingQuery(() => db.payments.orderBy('date').toArray());
    const chartData = useMemo(() => {
        return payments?.reduce((acc, p) => {
            const month = new Date(p.date).toLocaleString('default', { month: 'short' });
            const existing = acc.find(item => item.name === month);
            if (existing) {
                if (p.status === 'paid') existing.paid += p.amount; else existing.due += p.amount;
            } else {
                acc.push({ name: month, paid: p.status === 'paid' ? p.amount : 0, due: p.status === 'due' ? p.amount : 0 });
            }
            return acc;
        }, [] as { name: string; paid: number; due: number }[]).reverse() ?? [];
    }, [payments]);
    return (
        <div className="space-y-4 h-[500px]">
            <h3 className="text-xl font-semibold text-[clamp(1.125rem,4vw,1.25rem)]">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Legend />
                    <Bar dataKey="paid" fill={BIO_GREEN} />
                    <Bar dataKey="due" fill="#b71c1c" />
                </RechartsBarChart>
            </ResponsiveContainer>
            <h3 className="text-xl font-semibold text-[clamp(1.125rem,4vw,1.25rem)]">Recent Transactions</h3>
            <ul className="space-y-2">
                {payments?.slice(-5).reverse().map(p => (
                    <li key={p.id} className="flex justify-between p-2 bg-white/5 rounded-lg text-[clamp(1rem,4vw,1.125rem)]">
                        <span>{p.client}</span>
                        <span className={cn(p.status === 'paid' ? 'text-green-400' : 'text-red-400')}>${p.amount.toFixed(2)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
const ComplianceDashboard = () => {
    const logs = usePollingQuery(() => db.complianceLogs.orderBy('timestamp').reverse().toArray());
    const toggleCompliance = async (log: ComplianceLog) => {
        const newCompliant = !log.compliant;
        const updatedLog = { ...log, compliant: newCompliant };
        await db.complianceLogs.update(log.id, { compliant: newCompliant });
        await syncWithBackend('complianceLogs', 'update', updatedLog);
    };
    return (
        <ul className="space-y-2">
            {logs?.map(log => (
                <li key={log.id} onDoubleClick={() => toggleCompliance(log)} className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer transition-colors hover:bg-white/10">
                    <div className="flex-grow text-[clamp(1rem,4vw,1.125rem)]">
                        <p>{log.description}</p>
                        <p className="text-xs text-neutral-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => toggleCompliance(log)}>
                        {log.compliant ? <ShieldCheck className="text-green-500" /> : <XCircle className="text-red-500" />}
                    </Button>
                </li>
            ))}
        </ul>
    );
};
const TrainingDashboard = () => {
    const modules = usePollingQuery(() => db.trainingModules.toArray());
    const [emblaRef] = useEmblaCarousel();
    const toggleModule = async (mod: TrainingModule) => {
        const newCompleted = !mod.completed;
        const updatedModule = { ...mod, completed: newCompleted };
        await db.trainingModules.update(mod.id, { completed: newCompleted });
        await syncWithBackend('trainingModules', 'update', updatedModule);
    };
    return (
        <div className="embla" ref={emblaRef}>
            <div className="embla__container">
                {modules?.map(mod => (
                    <div className="embla__slide p-2" key={mod.id}>
                        <Accordion type="single" collapsible className="w-full bg-white/5 p-2 rounded-lg">
                            <AccordionItem value={mod.id} className="border-white/10">
                                <AccordionTrigger className="hover:no-underline text-[clamp(1rem,4vw,1.125rem)]">
                                    <div className="flex items-center gap-4 w-full">
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleModule(mod); }}>
                                            {mod.completed ? <CheckCircle className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-neutral-400" />}
                                        </Button>
                                        <span className={cn(mod.completed && 'line-through text-neutral-500')}>{mod.title}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-[clamp(1rem,4vw,1.125rem)]">This is the content for the training module. In a real app, this would contain text, images, or videos.</AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                ))}
            </div>
        </div>
    );
};
const AiDashboard = () => {
    const messages = usePollingQuery(() => db.aiMessages.orderBy('timestamp').toArray());
    const [input, setInput] = useState('');
    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage: AiMessage = { id: uuidv4(), role: 'user', content: input, timestamp: Date.now() };
        await db.aiMessages.add(userMessage);
        await syncWithBackend('aiMessages', 'create', userMessage);
        setInput('');
        setTimeout(async () => {
            const aiResponse: AiMessage = { id: uuidv4(), role: 'ai', content: `This is a simulated AI response to: "${input}"`, timestamp: Date.now() };
            await db.aiMessages.add(aiResponse);
            await syncWithBackend('aiMessages', 'create', aiResponse);
        }, 1000);
    };
    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow space-y-4 overflow-y-auto p-2">
                {messages?.map(msg => (
                    <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn("max-w-xs p-3 rounded-2xl text-[clamp(1rem,4vw,1.125rem)]", msg.role === 'user' ? 'bg-green-600 rounded-br-none' : 'bg-neutral-700 rounded-bl-none')}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 p-2 border-t border-white/10">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask AI..." className="bg-black/20 border-white/10 text-[clamp(1rem,4vw,1.125rem)]" />
                <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700"><Send size={18} /></Button>
            </div>
        </div>
    );
};
// --- Settings Sheet ---
const SettingsSheet = ({ onLogout }: { onLogout: () => void }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    if (!navigator.onLine) {
        toast.error("You are offline. Cannot sync.");
        return;
    }
    const itemsToSync = await db.outbox.toArray();
    if (itemsToSync.length === 0) {
        toast.info("Everything is up to date.");
        return;
    }
    setIsSyncing(true);
    const syncToast = toast.loading("Syncing data with the server...");
    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsToSync }),
        });
        if (!response.ok) throw new Error('Sync failed on the server.');
        const result = await response.json();
        if (result.success && result.data) {
            await db.outbox.clear();
            toast.success(`${result.data.synced} items synced successfully!`, { id: syncToast });
        } else {
            throw new Error(result.error || 'Unknown sync error');
        }
    } catch (error) {
        toast.error("Sync failed. Please try again later.", { id: syncToast });
        console.error("Manual sync error:", error);
    } finally {
        setIsSyncing(false);
    }
  }, [isSyncing]);
  useEffect(() => {
    window.addEventListener('online', handleManualSync);
    return () => {
      window.removeEventListener('online', handleManualSync);
    };
  }, [handleManualSync]);
  const clearDatabase = async () => {
    try {
      await db.delete();
      await db.open();
      toast.success("Database cleared. Please refresh the application.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast.error("Failed to clear database.");
    }
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white"><Settings /></Button>
      </SheetTrigger>
      <SheetContent className="bg-black/50 border-l-white/20 text-white/90 backdrop-blur-[20px]" aria-describedby="settings-description">
        <span id="settings-description" className="sr-only">Settings panel</span>
        <SheetHeader><SheetTitle className="text-white">Settings</SheetTitle></SheetHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Manual Sync</h3>
            <p className="text-sm text-neutral-400">Force sync local data with the network. Sync also runs automatically when online.</p>
            <Button onClick={handleManualSync} disabled={isSyncing} className="w-full bg-green-600 text-white hover:bg-green-700">
              {isSyncing ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : 'Start Manual Sync'}
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-red-400">Danger Zone</h3>
            <Button variant="destructive" className="w-full" onClick={clearDatabase}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Local Database
            </Button>
          </div>
          <Button variant="outline" className="w-full border-neutral-700 hover:bg-neutral-800" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
        <footer className="absolute bottom-4 left-4 right-4 text-center text-xs text-neutral-500">
            Built with ❤️ at Cloudflare
        </footer>
      </SheetContent>
    </Sheet>
  );
};