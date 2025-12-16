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
      sessions: '++id, userId, &token', // Index the session token for efficient lookups
      tasks: '++id, assignedTo, status',
      payments: '++id, status',
      complianceLogs: '++id, isCompliant',
      outbox: '++id',
    });
  }
  async seedIfEmpty() {
    // Seed demo users in an idempotent, non‑transactional way.
    // Compute the password hash once to avoid repeated work.
    const passwordHash = await hashText('Auditor123');
    console.log('Seeding demo users if missing...');
    for (const u of DEMO_USERS_CONFIG) {
      const existingUser = await this.users.where('email').equalsIgnoreCase(u.email).first();
      if (!existingUser) {
        const userToCreate: User = {
          id: uuidv4(),
          email: u.email,
          passwordHash,
          role: u.role as User['role'],
          permissions: u.permissions,
        };
        try {
          await this.users.add(userToCreate);
          console.log(`Seeded user: ${u.email}`);
        } catch (error) {
          // Ignore duplicate‑key errors that could arise from race conditions.
          console.warn(`Failed to add user ${u.email}:`, error);
        }
      } else {
        console.log(`User ${u.email} already exists, skipping.`);
      }
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