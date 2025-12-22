import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Briefcase, CreditCard, ShieldCheck, BookOpen, Bot, LogOut, Loader,
  Signal, Battery, Mail, Lock, Send, ArrowLeft, Menu, CheckCircle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import Dexie, { type Table } from 'dexie';
import { useGesture } from '@use-gesture/react';
import { v4 as uuidv4 } from 'uuid';
import { hashText } from '@/lib/fast-hash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { User, Session, Task, Payment, ComplianceLog, TrainingModule, AiMessage } from '@shared/types';
// --- Database ---
class SuiteWasteDB extends Dexie {
  users!: Table<User, string>;
  sessions!: Table<Session, string>;
  tasks!: Table<Task, string>;
  payments!: Table<Payment, string>;
  complianceLogs!: Table<ComplianceLog, string>;
  trainingModules!: Table<TrainingModule, string>;
  aiMessages!: Table<AiMessage, string>;
  constructor() {
    super('SuiteWasteDB');
    this.version(6).stores({
      users: 'id, &email, role',
      sessions: 'id, userId, createdAt',
      tasks: 'id, status, assignedTo, dueDate',
      payments: 'id, status, date',
      complianceLogs: 'id, compliant, timestamp',
      trainingModules: 'id, completed',
      aiMessages: 'id, timestamp',
    });
  }
  async seedIfEmpty() {
    await this.transaction('rw', this.users, this.tasks, this.payments, this.complianceLogs, this.trainingModules, async () => {
      const userCount = await this.users.count();
      if (userCount > 0) return;
      const passwordHash = await hashText('Auditor123');
      await this.users.put({
        id: 'seed-ops-manager',
        email: 'manager@suitewaste.os',
        name: 'Operations Manager',
        role: 'Operations Manager',
        permissions: ['operations', 'payments', 'compliance', 'training', 'ai'],
        passwordHash
      });
      const manager = await this.users.toCollection().first();
      if (manager) {
        await this.tasks.add({ id: uuidv4(), title: 'Route #101 Pickup', status: 'pending' as const, assignedTo: manager.id, dueDate: Date.now() });
        await this.payments.add({ id: uuidv4(), amount: 1500, status: 'due' as const, client: 'WasteCorp A', date: Date.now() });
        await this.complianceLogs.add({ id: uuidv4(), description: 'Site safety check', compliant: true, timestamp: Date.now() });
        await this.trainingModules.add({ id: uuidv4(), title: 'Hazmat 101', content: '...', completed: true });
      }
    });
  }
  async signIn(email: string, password: string): Promise<User | null> {
    const user = await this.users.where({ email }).first();
    if (!user || !user.passwordHash) return null;
    const inputHash = await hashText(password);
    if (inputHash === user.passwordHash) {
      const session = { id: uuidv4(), userId: user.id, createdAt: Date.now() };
      await this.sessions.clear();
      await this.sessions.add(session);
      return user;
    }
    return null;
  }
  async getCurrentUser(): Promise<User | null> {
    const session = await this.sessions.orderBy('createdAt').last();
    if (!session) return null;
    const user = await this.users.get(session.userId);
    return user || null;
  }
}
const db = new SuiteWasteDB();
// --- Components ---
const SuiteBarChart = ({ data }: { data: { name: string; paid: number; due: number }[] }) => (
  <div className="w-full aspect-video bg-black/40 rounded-xl p-4 flex items-end justify-around border border-white/5">
    {data.map((d, i) => {
      const maxVal = Math.max(...data.map(item => Math.max(item.paid, item.due)), 1000);
      const paidH = (d.paid / maxVal) * 120;
      const dueH = (d.due / maxVal) * 120;
      return (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="flex gap-1 h-[120px] items-end">
            <motion.div initial={{ height: 0 }} animate={{ height: paidH }} className="w-3 bg-green-600 rounded-t-sm" />
            <motion.div initial={{ height: 0 }} animate={{ height: dueH }} className="w-3 bg-red-600 rounded-t-sm" />
          </div>
          <span className="text-[8px] text-white/40">{d.name}</span>
        </div>
      );
    })}
  </div>
);
function usePollingQuery<T>(queryFn: () => Promise<T[]>, intervalMs = 3000) {
  const [data, setData] = useState<T[]>([]);
  const queryRef = useRef(queryFn);
  useEffect(() => { queryRef.current = queryFn; }, [queryFn]);
  useEffect(() => {
    const fetch = () => queryRef.current().then(setData).catch(console.error);
    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return data;
}
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars'),
});
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'manager@suitewaste.os', password: 'Auditor123' }
  });
  const onSubmit = async (v: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const user = await db.signIn(v.email, v.password);
    if (user) onLoginSuccess(user);
    else toast.error("Invalid credentials");
    setLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <motion.svg
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          viewBox='0 0 100 100'
          className='w-32 h-32 mx-auto mb-6'
          style={{ filter: 'drop-shadow(0 0 15px rgba(46, 125, 50, 0.8))' }}
        >
          <path fill='#22C55E' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5' d='M 50 5 Q 35 15 30 40 Q 28 55 40 70 Q 50 82 60 70 Q 72 55 70 40 Q 65 15 50 5 Z' />
        </motion.svg>
        <h1 className="text-4xl font-bold text-white mb-2">SuiteWaste OS</h1>
        <p className="text-gray-400 text-xs uppercase tracking-widest">Industrial Waste Management</p>
        <Card className="bg-black/40 border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormControl><div className="relative"><Mail className="absolute left-3 top-3 w-5 h-5 text-green-500/50" /><Input placeholder="Email" className="bg-white/5 border-white/10 pl-10 h-12 rounded-xl text-white" {...field} /></div></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormControl><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-green-500/50" /><Input type="password" placeholder="Password" className="bg-white/5 border-white/10 pl-10 h-12 rounded-xl text-white" {...field} /></div></FormControl></FormItem>
              )} />
              <Button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-600 h-12 rounded-xl font-bold transition-transform active:scale-95">
                {loading ? <Loader className="animate-spin" /> : 'Sign In'}
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
export function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSuite, setActiveSuite] = useState<typeof SUITES[number]['key'] | null>(null);
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
  const availableSuites = useMemo(() => {
    if (!currentUser?.permissions) return [];
    return SUITES.filter(s => s.permissions.some(p => currentUser.permissions.includes(p)));
  }, [currentUser]);
  if (loading) return null;
  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen bg-black flex items-center justify-center">
      <div className="py-8 md:py-10 lg:py-12 w-full flex justify-center">
        <div
          className="relative h-[85vh] w-full max-w-md bg-black/60 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          {...(bindGestures as any)()}
        >
          {/* Status Bar */}
          <div className="flex justify-between px-8 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/20">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex gap-2"><Signal size={12} /><Battery size={12} /></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeSuite ? (
                <motion.div key="suite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setActiveSuite(null)} className="text-white/50"><ArrowLeft /></Button>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter">{SUITES.find(s => s.key === activeSuite)?.label}</h2>
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
                <motion.div key="grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-8">
                  <h1 className="text-2xl font-bold text-white mb-10 text-center">Hello, {currentUser.name.split(' ')[0]}</h1>
                  <div className="grid grid-cols-3 gap-8">
                    {availableSuites.map(s => (
                      <button key={s.key} onClick={() => setActiveSuite(s.key)} className="flex flex-col items-center gap-3 group">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center transition-all group-active:scale-90 group-hover:bg-green-600/20 group-hover:border-green-600/50">
                          <s.icon className="text-white w-7 h-7" />
                        </div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Dock */}
          <div className="p-6 bg-black/40 border-t border-white/5 flex justify-around items-center">
            <Button variant="ghost" size="icon" onClick={() => setSwitcherOpen(true)} className="text-white/30"><Menu /></Button>
            <Button variant="ghost" size="icon" onClick={() => { db.sessions.clear(); setCurrentUser(null); }} className="text-white/30"><LogOut /></Button>
          </div>
          {/* Suite Switcher Overlay (3D Coverflow) */}
          <AnimatePresence>
            {isSwitcherOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-50 flex flex-col items-center justify-center p-8"
                onClick={() => setSwitcherOpen(false)}
              >
                <div className="flex gap-4 overflow-x-auto w-full px-6 py-10 scrollbar-hide" style={{ perspective: 1000 }}>
                  {availableSuites.map((s) => (
                    <motion.button
                      key={s.key}
                      initial={{ rotateY: 45, translateZ: -100 }}
                      animate={{ rotateY: 0, translateZ: 0 }}
                      whileHover={{ scale: 1.1, rotateY: 10, z: 50 }}
                      onClick={(e) => { e.stopPropagation(); setActiveSuite(s.key); setSwitcherOpen(false); }}
                      className="flex-shrink-0 w-32 h-48 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-md"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <s.icon className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">{s.label}</span>
                    </motion.button>
                  ))}
                </div>
                <p className="text-white/20 text-[10px] mt-10 uppercase tracking-widest font-bold">Swipe or tap to switch</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
// --- Suite Dashboard Detail Views ---
const OperationsSuite = () => {
  const tasks = usePollingQuery(() => db.tasks.toArray());
  const nodes: Node[] = useMemo(() => tasks.map((t, i) => ({
    id: t.id,
    data: { label: t.title },
    position: { x: 50, y: i * 80 },
    style: { background: t.status === 'completed' ? '#2E7D32' : '#222', color: 'white', borderRadius: '12px', fontSize: '10px', border: '1px solid rgba(255,255,255,0.1)' }
  })), [tasks]);
  return (
    <div className="h-full bg-black/20 rounded-2xl overflow-hidden border border-white/5 relative">
      <ReactFlow nodes={nodes} edges={[]} fitView>
        <Background color="#111" />
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
        {payments.map(p => (
          <div key={p.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5 backdrop-blur-sm">
            <div>
              <p className="text-white font-bold text-sm">{p.client}</p>
              <p className="text-[10px] text-white/40">{new Date(p.date).toLocaleDateString()}</p>
            </div>
            <p className={cn("font-mono font-bold text-sm", p.status === 'paid' ? 'text-green-500' : 'text-red-500')}>
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
      {logs.map(l => (
        <div key={l.id} className="bg-white/5 p-4 rounded-xl flex gap-4 items-start border border-white/5 backdrop-blur-sm">
          <div className={cn("mt-1 w-2 h-2 rounded-full shadow-lg", l.compliant ? 'bg-green-500' : 'bg-red-500')} />
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
      {mods.map(m => (
        <div key={m.id} className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold text-sm">{m.title}</h3>
            {m.completed && <CheckCircle className="text-green-500 w-5 h-5" />}
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: m.completed ? '100%' : '30%' }} className="bg-green-600 h-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
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
    if (!input.trim()) return;
    setMsgs(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setTimeout(() => {
      setMsgs(prev => [...prev, { role: 'ai', content: 'Processing fleet optimization request... done. Route 42 optimized for fuel efficiency.' }]);
    }, 800);
  };
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
        {msgs.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] p-4 rounded-2xl text-xs backdrop-blur-sm", m.role === 'ai' ? 'bg-white/5 text-white border border-white/10 rounded-tl-none' : 'bg-green-800/80 text-white ml-auto rounded-tr-none')}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend()} 
          placeholder="Ask AI Assistant..." 
          className="bg-white/5 border-white/10 rounded-xl h-11 text-white placeholder:text-white/20" 
        />
        <Button onClick={handleSend} className="bg-green-700 h-11 rounded-xl w-11 p-0 flex items-center justify-center"><Send size={16} /></Button>
      </div>
    </div>
  );
};