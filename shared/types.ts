export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// SuiteWaste OS Specific Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  passwordHash?: string; // Optional as it should not be sent to the client
}
export interface Session {
  id: string;
  userId: string;
  createdAt: number;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  assignedTo: string;
  dueDate: number;
}
export interface Payment {
  id:string;
  amount: number;
  status: 'paid' | 'due';
  client: string;
  date: number;
}
export interface ComplianceLog {
  id: string;
  description: string;
  compliant: boolean;
  timestamp: number;
}
export interface TrainingModule {
  id: string;
  title: string;
  content: string;
  completed: boolean;
}
export interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}
export interface OutboxItem {
  id: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}