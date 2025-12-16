export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface User {
  id: string;
  name: string;
}
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
// SuiteWaste OS Specific Types
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  assignedTo: string;
  dueDate: number;
}
export interface Payment {
  id: string;
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