import Dexie, { type Table } from 'dexie';
import { hashText } from './fast-hash';
import { v4 as uuidv4 } from 'uuid';
// Define interfaces for our database tables.
// These could be expanded from shared/types.ts if needed.
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'Field Operator' | 'Operations Manager' | 'Compliance/Audit Officer' | 'Executive' | 'Training Officer';
  permissions: string[];
}
export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
}
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'in-progress';
  assignedTo: string; // userId
}
export interface Payment {
  id: string;
  amount: number;
  status: 'paid' | 'pending';
  date: number;
}
export interface ComplianceLog {
  id: string;
  description: string;
  isCompliant: boolean;
  timestamp: number;
}
export interface OutboxItem {
  id?: number;
  payload: unknown;
  endpoint: string;
  timestamp: number;
}
const DEMO_USERS_CONFIG = [
    { email: 'field@suitewaste.os', role: 'Field Operator', permissions: ['operations', 'training', 'ewaste'] },
    { email: 'manager@suitewaste.os', role: 'Operations Manager', permissions: ['operations', 'payments', 'compliance', 'training', 'ai'] },
    { email: 'auditor@suitewaste.os', role: 'Compliance/Audit Officer', permissions: ['compliance', 'training'] },
    { email: 'executive@suitewaste.os', role: 'Executive', permissions: ['payments', 'compliance', 'ai'] },
    { email: 'trainer@suitewaste.os', role: 'Training Officer', permissions: ['training', 'ai'] },
];
class SuiteWasteDB extends Dexie {
  users!: Table<User>;
  sessions!: Table<Session>;
  tasks!: Table<Task>;
  payments!: Table<Payment>;
  complianceLogs!: Table<ComplianceLog>;
  outbox!: Table<OutboxItem>;
  constructor() {
    super('SuiteWasteDB');
    this.version(1).stores({
      users: '++id, &email',
      sessions: '++id, userId',
      tasks: '++id, assignedTo, status',
      payments: '++id, status',
      complianceLogs: '++id, isCompliant',
      outbox: '++id',
    });
  }
  async seedIfEmpty() {
    const userCount = await this.users.count();
    if (userCount === 0) {
      console.log('Database is empty, seeding demo users...');
      const passwordHash = await hashText('Auditor123');
      const usersToCreate: User[] = DEMO_USERS_CONFIG.map(u => ({
        id: uuidv4(),
        email: u.email,
        passwordHash,
        role: u.role as User['role'],
        permissions: u.permissions,
      }));
      await this.users.bulkAdd(usersToCreate);
      console.log(`${usersToCreate.length} demo users seeded.`);
    }
  }
  async signIn(email: string, password: string): Promise<User | null> {
    const passwordHash = await hashText(password);
    const user = await this.users.where('email').equalsIgnoreCase(email).first();
    if (user && user.passwordHash === passwordHash) {
      const session = {
        id: uuidv4(),
        userId: user.id,
        token: uuidv4(),
        createdAt: Date.now(),
      };
      await this.sessions.add(session);
      localStorage.setItem('SUITEWASTE_SESSION_TOKEN', session.token);
      return user;
    }
    return null;
  }
  async signOut() {
    const token = localStorage.getItem('SUITEWASTE_SESSION_TOKEN');
    if (token) {
      await this.sessions.where('token').equals(token).delete();
      localStorage.removeItem('SUITEWASTE_SESSION_TOKEN');
    }
  }
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('SUITEWASTE_SESSION_TOKEN');
    if (!token) return null;
    const session = await this.sessions.where('token').equals(token).first();
    if (!session) {
        localStorage.removeItem('SUITEWASTE_SESSION_TOKEN');
        return null;
    }
    return this.users.get(session.userId).then(user => user || null);
  }
}
export const db = new SuiteWasteDB();