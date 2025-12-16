/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, Task, Payment, ComplianceLog, TrainingModule, AiMessage } from "@shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS } from "@shared/mock-data";
// USER ENTITY: one DO instance per user
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "" };
  static seedData = MOCK_USERS;
}
// CHAT BOARD ENTITY: one DO instance per chat board, stores its own messages
export type ChatBoardState = Chat & { messages: ChatMessage[] };
const SEED_CHAT_BOARDS: ChatBoardState[] = MOCK_CHATS.map(c => ({
  ...c,
  messages: MOCK_CHAT_MESSAGES.filter(m => m.chatId === c.id),
}));
export class ChatBoardEntity extends IndexedEntity<ChatBoardState> {
  static readonly entityName = "chat";
  static readonly indexName = "chats";
  static readonly initialState: ChatBoardState = { id: "", title: "", messages: [] };
  static seedData = SEED_CHAT_BOARDS;
  async listMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.getState();
    return messages;
  }
  async sendMessage(userId: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = { id: crypto.randomUUID(), chatId: this.id, userId, text, ts: Date.now() };
    await this.mutate(s => ({ ...s, messages: [...s.messages, msg] }));
    return msg;
  }
}
// --- SuiteWaste OS Entities ---
export class TaskEntity extends IndexedEntity<Task> {
  static readonly entityName = "task";
  static readonly indexName = "tasks";
  static readonly initialState: Task = { id: "", title: "", status: "pending", assignedTo: "", dueDate: 0 };
  static seedData = Array.from({ length: 20 }, (_, i) => ({
    id: crypto.randomUUID(),
    title: `Task #${i + 1}: Collect from Client ${String.fromCharCode(65 + (i % 10))}`,
    status: i % 3 === 0 ? 'completed' : 'pending',
    assignedTo: 'manager-id-placeholder',
    dueDate: Date.now() + (i - 10) * 86400000,
  }));
}
export class PaymentEntity extends IndexedEntity<Payment> {
  static readonly entityName = "payment";
  static readonly indexName = "payments";
  static readonly initialState: Payment = { id: "", amount: 0, status: "due", client: "", date: 0 };
  static seedData = Array.from({ length: 15 }, (_, i) => ({
    id: crypto.randomUUID(),
    amount: Math.floor(Math.random() * 5000) + 1000,
    status: i % 4 === 0 ? 'due' : 'paid',
    client: `Client Corp ${String.fromCharCode(65 + (i % 10))}`,
    date: Date.now() - i * 7 * 86400000,
  }));
}
export class ComplianceLogEntity extends IndexedEntity<ComplianceLog> {
  static readonly entityName = "compliancelog";
  static readonly indexName = "compliancelogs";
  static readonly initialState: ComplianceLog = { id: "", description: "", compliant: false, timestamp: 0 };
  static seedData = Array.from({ length: 25 }, (_, i) => ({
    id: crypto.randomUUID(),
    description: `Log entry for site visit ${i + 1}. Checked safety protocols.`,
    compliant: Math.random() > 0.2,
    timestamp: Date.now() - i * 3 * 86400000,
  }));
}
export class TrainingModuleEntity extends IndexedEntity<TrainingModule> {
  static readonly entityName = "trainingmodule";
  static readonly indexName = "trainingmodules";
  static readonly initialState: TrainingModule = { id: "", title: "", content: "", completed: false };
  static seedData = [
    { id: crypto.randomUUID(), title: 'Safety Protocols 101', content: '...', completed: true },
    { id: crypto.randomUUID(), title: 'Waste Handling Procedures', content: '...', completed: true },
    { id: crypto.randomUUID(), title: 'Emergency Response', content: '...', completed: false },
    { id: crypto.randomUUID(), title: 'Client Communication', content: '...', completed: false },
  ];
}
export class AiMessageEntity extends IndexedEntity<AiMessage> {
  static readonly entityName = "aimessage";
  static readonly indexName = "aimessages";
  static readonly initialState: AiMessage = { id: "", role: "ai", content: "", timestamp: 0 };
  static seedData = [
    { id: crypto.randomUUID(), role: 'ai', content: 'Welcome to AI Assist. How can I help you optimize operations today?', timestamp: Date.now() - 10000 },
  ];
}