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
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
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
        await this.users.put({ id: uuidv4(), passwordHash, ...u });
      }
    });
    const manager = await this.users.where({ role: 'Operations Manager' }).first();
    if (!manager) return;
    await this.transaction('rw', this.tasks, this.payments, this.complianceLogs, this.trainingModules, this.aiMessages, async () => {
      const tasksToSeed = Array.from({ length: 12 }, (_, i) => ({ id: uuidv4(), title: `Route #${i + 101}: Industrial Pickup`, status: i % 3 === 0 ? 'completed' as const : 'pending' as const, assignedTo: manager.id, dueDate: Date.now() + (i - 5) * 86400000 }));
      await this.tasks.bulkAdd(tasksToSeed);
      const paymentsToSeed = Array.from({ length: 8 }, (_, i) => ({ id: uuidv4(), amount: 1200 + (i * 450), status: i % 3 === 0 ? 'due' as const : 'paid' as const, client: `WasteCorp ${String.fromCharCode(65 + i)}`, date: Date.now() - i * 86400000 * 5 }));
      await this.payments.bulkAdd(paymentsToSeed);
      const logsToSeed = Array.from({ length: 10 }, (_, i) => ({ id: uuidv4(), description: `Safety Audit Site ${i + 1}`, compliant: i % 4 !== 0, timestamp: Date.now() - i * 86400000 }));
      await this.complianceLogs.bulkAdd(logsToSeed);
      const modulesToSeed = [{ id: uuidv4(), title: 'Hazmat Handling', content: '...', completed: true }, { id: uuidv4(), title: 'OSHA 300 Basics', content: '...', completed: false }];
      await this.trainingModules.bulkAdd(modulesToSeed);
      await this.aiMessages.add({ id: uuidv4(), role: 'ai', content: 'Systems ready. How can I assist with waste logistics today?', timestamp: Date.now() });
    });
  }
  async signIn(email: string, password: string): Promise<User | null> {
    const user = await this.users.where({ email }).first();
    if (!user || !user.passwordHash) return null;
    const inputHash = await hashText(password);
    if (inputHash === user.passwordHash) {
      await this.sessions.clear();
      const session = { id: uuidv4(), userId: user.id, createdAt: Date.now() };
      await this.sessions.add(session);
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
// --- SVG Chart Component ---
const SuiteBarChart = ({ data }: { data: { name: string; paid: number; due: number }[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.paid, d.due)), 1000);
  const chartHeight = 200;
  const chartWidth = 400;
  const barWidth = 20;
  const gap = 30;
  return (
    <div className="w-full aspect-video bg-black/40 rounded-xl p-4 flex items-end justify-around border border-white/5">
      {data.map((d, i) => {
        const paidHeight = (d.paid / maxVal) * chartHeight;
        const dueHeight = (d.due / maxVal) * chartHeight;
        return (
          <div key={i} className="flex flex-col items-center gap-2 group">
            <div className="flex gap-1 h-[200px] items-end">
              <motion.div initial={{ height: 0 }} animate={{ height: paidHeight }} className="w-4 bg-green-600 rounded-t-sm" />
              <motion.div initial={{ height: 0 }} animate={{ height: dueHeight }} className="w-4 bg-red-600 rounded-t-sm" />
            </div>
            <span className="text-[10px] text-white/50">{d.name}</span>
          </div>
        );
      })}
    </div>
  );
};
// --- Custom Hooks ---
function usePollingQuery<T>(queryFn: () => Promise<T[]>, intervalMs = 2000) {
  const [data, setData] = useState<T[]>([]);
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const result = await queryFnRef.current();
        if (isMounted) setData(result);
      } catch (e) { console.error(e); }
    };
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => { isMounted = false; clearInterval(id); };
  }, [intervalMs]);
  return data;
}
// --- OS UI Components ---
const LoadingScreen = () => (
  <div className="fixed inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center gap-6">
    <motion.img 
      src="https://i.imgur.com/Jt5g2S6.png" 
      alt="SuiteWaste" 
      className="w-24 h-24" 
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} 
      transition={{ repeat: Infinity, duration: 2 }}
    />
    <p className="text-white/40 text-sm tracking-widest uppercase">Initializing SuiteWaste OS</p>
  </div>
);
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars'),
});
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    const user = await db.signIn(values.email, values.password);
    if (user) {
      toast.success(`Welcome back, ${user.name}`);
      onLoginSuccess(user);
    } else {
      toast.error("Invalid credentials");
    }
    setIsSubmitting(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <motion.img 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            src="https://i.imgur.com/Jt5g2S6.png" 
            alt="SuiteWaste" 
            className="w-32 h-32 mx-auto mb-6"
            style={{ filter: 'drop-shadow(0 0 15px rgba(46, 125, 50, 0.8))' }}
          />
          <h1 className="text-4xl font-bold text-white mb-2">SuiteWaste OS</h1>
          <p className="text-gray-400 font-medium uppercase tracking-wider text-xs">Industrial Waste Management</p>
        </div>
        <Card className="bg-black/40 border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-green-500/50" />
                      <Input placeholder="Email" className="bg-white/5 border-white/10 pl-10 h-12 rounded-xl text-white" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-green-500/50" />
                      <Input type="password" placeholder="Password" className="bg-white/5 border-white/10 pl-10 h-12 rounded-xl text-white" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
              <Button type="submit" disabled={isSubmitting} className="w-full bg-green-700 hover:bg-green-600 h-12 rounded-xl font-bold text-lg transition-transform active:scale-95">
                {isSubmitting ? <Loader className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};
const SUITES = [
  { key: 'operations', label: 'Routes', icon: Briefcase, permissions: ['operations'] },
  { key: 'payments', label: 'Finance', icon: CreditCard, permissions: ['payments'] },
  { key: 'compliance', label: 'Audit', icon: ShieldCheck, permissions: ['compliance'] },
  { key: 'training', label: 'Academy', icon: BookOpen, permissions: ['training'] },
  { key: 'ai', label: 'Assistant', icon: Bot, permissions: ['ai'] },
] as const;
type SuiteKey = typeof SUITES[number]['key'];
export function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSuite, setActiveSuite] = useState<SuiteKey | null>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    db.open().then(() => db.seedIfEmpty()).then(() => db.getCurrentUser()).then(u => {
      setCurrentUser(u);
      setLoading(false);
    });
  }, []);
  const bindGestures = useGesture({
    onDrag: ({ active, touches, movement: [mx] }) => {
      if (active && touches >= 2 && Math.abs(mx) > 60) setSwitcherOpen(true);
    },
  });
  if (loading) return <LoadingScreen />;
  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;
  const availableSuites = SUITES.filter(s => s.permissions.some(p => currentUser.permissions.includes(p)));
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <div 
          className="relative h-[85vh] max-w-md mx-auto bg-black/60 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          {...(bindGestures() as any)}
        >
          {/* Status Bar */}
          <div className="flex justify-between px-8 py-3 text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/20">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex gap-2">
              <Signal size={12} />
              <Battery size={12} />
            </div>
          </div>
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeSuite ? (
                <motion.div key="suite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setActiveSuite(null)} className="text-white/50"><ArrowLeft /></Button>
                    <h2 className="text-xl font-bold text-white">{SUITES.find(s => s.key === activeSuite)?.label}</h2>
                  </div>
                  <div className="flex-1">
                    {activeSuite === 'operations' && <OperationsSuite />}
                    {activeSuite === 'payments' && <PaymentsSuite />}
                    {activeSuite === 'compliance' && <ComplianceSuite />}
                    {activeSuite === 'training' && <TrainingSuite />}
                    {activeSuite === 'ai' && <AiSuite />}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="grid" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-8">
                  <h1 className="text-2xl font-bold text-white mb-8 text-center">Hello, {currentUser.name.split(' ')[0]}</h1>
                  <div className="grid grid-cols-3 gap-6">
                    {availableSuites.map(s => (
                      <button 
                        key={s.key} 
                        onClick={() => setActiveSuite(s.key)}
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center transition-all group-active:scale-90 group-hover:bg-green-600/20 group-hover:border-green-600/50">
                          <s.icon className="text-white w-7 h-7" />
                        </div>
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Dock */}
          <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center gap-8">
            <Button variant="ghost" size="icon" onClick={() => setSwitcherOpen(true)} className="rounded-full text-white/30"><Menu /></Button>
            <Button variant="ghost" size="icon" onClick={() => { db.signOut().then(() => setCurrentUser(null)); }} className="rounded-full text-white/30"><LogOut /></Button>
          </div>
          {/* Suite Switcher Overlay */}
          <AnimatePresence>
            {isSwitcherOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8"
                onClick={() => setSwitcherOpen(false)}
              >
                <div className="grid grid-cols-2 gap-8 w-full">
                  {availableSuites.map(s => (
                    <button 
                      key={s.key} 
                      onClick={() => { setActiveSuite(s.key); setSwitcherOpen(false); }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center">
                        <s.icon className="w-10 h-10 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-widest">{s.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
// --- Suite Dashboards ---
const OperationsSuite = () => {
  const tasks = usePollingQuery(() => db.tasks.toArray());
  const nodes: Node[] = tasks?.map((t, i) => ({
    id: t.id,
    data: { label: t.title },
    position: { x: 50, y: i * 80 },
    style: { background: t.status === 'completed' ? BIO_GREEN : '#333', color: 'white', borderRadius: '12px', fontSize: '10px' }
  })) ?? [];
  return (
    <div className="h-full bg-black/20 rounded-2xl overflow-hidden border border-white/5">
      <ReactFlow nodes={nodes} edges={[]} fitView>
        <Background color="#222" />
        <Controls />
      </ReactFlow>
    </div>
  );
};
const PaymentsSuite = () => {
  const payments = usePollingQuery(() => db.payments.toArray());
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({
      name: m,
      paid: payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) / 6 || 0,
      due: payments?.filter(p => p.status === 'due').reduce((sum, p) => sum + p.amount, 0) / 6 || 0,
    }));
  }, [payments]);
  return (
    <div className="space-y-6">
      <SuiteBarChart data={chartData} />
      <div className="space-y-2">
        {payments?.map(p => (
          <div key={p.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div>
              <p className="text-white font-bold text-sm">{p.client}</p>
              <p className="text-[10px] text-white/40">{new Date(p.date).toLocaleDateString()}</p>
            </div>
            <p className={cn("font-mono font-bold", p.status === 'paid' ? 'text-green-500' : 'text-red-500')}>
              ${p.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
const ComplianceSuite = () => {
  const logs = usePollingQuery(() => db.complianceLogs.toArray());
  return (
    <div className="space-y-3">
      {logs?.map(l => (
        <div key={l.id} className="bg-white/5 p-4 rounded-xl flex gap-4 items-start border border-white/5">
          <div className={cn("mt-1 w-2 h-2 rounded-full shadow-lg", l.compliant ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50')} />
          <div>
            <p className="text-white text-sm font-medium">{l.description}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">{new Date(l.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
const TrainingSuite = () => {
  const mods = usePollingQuery(() => db.trainingModules.toArray());
  return (
    <div className="space-y-4">
      {mods?.map(m => (
        <div key={m.id} className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-bold">{m.title}</h3>
            {m.completed && <CheckCircle className="text-green-500 w-5 h-5" />}
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: m.completed ? '100%' : '30%' }} className="bg-green-600 h-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
const AiSuite = () => {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([{ role: 'ai', content: 'Operational status: Nominal. How can I help?' }]);
  const handleSend = () => {
    if (!input) return;
    setMsgs(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setTimeout(() => {
      setMsgs(prev => [...prev, { role: 'ai', content: 'Processing fleet optimization request...' }]);
    }, 600);
  };
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={cn("max-w-[80%] p-4 rounded-2xl text-xs", m.role === 'ai' ? 'bg-white/5 text-white border border-white/10 rounded-tl-none' : 'bg-green-800 text-white ml-auto rounded-tr-none')}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Assistant..." className="bg-white/5 border-white/10 rounded-xl" />
        <Button onClick={handleSend} className="bg-green-700 rounded-xl"><Send size={16} /></Button>
      </div>
    </div>
  );
};