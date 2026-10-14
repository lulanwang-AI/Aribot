// Mobile response DTOs deliberately differ from persisted web schema rows:
// numeric timestamps, like counts, and separately tracked likedBy arrays.
export interface MobileTriagePost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  anonymous: boolean;
  likes: number;
  likedBy: string[];
  commentCount: number;
  images: string[];
  status: string;
  createdAt: number;
  flagged: boolean;
}
export interface MobileComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  anonymous: boolean;
  parentId: string | null;
  likes: number;
  likedBy: string[];
  flagged: boolean;
  createdAt: number;
}
export interface MobileNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  specialty: string;
  tags: string[];
  imageUrl: string | null;
  likes: number;
  likedBy: string[];
  commentCount: number;
  publishedAt: number;
  createdAt: number;
}
export interface MobileGroup {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberCount: number;
  members: string[];
  imageUrl: string | null;
  createdAt: number;
}
export interface MobileMedEvent {
  id: string;
  title: string;
  description: string;
  date: number;
  location: string;
  type: string;
  specialty: string;
  maxCapacity: number;
  rsvps: string[];
  imageUrl: string | null;
  createdAt: number;
  organizer: string;
  cmeCredits: number;
}
export interface MobileChatThread {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  type: string;
}
export interface MobileChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: number;
  read: boolean;
}
export interface MobileTrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  cmeCredits: number;
  completedBy: string[];
  steps: { id: string; title: string; type: string; content: string }[];
  createdAt: number;
}
export interface MobileTelemedConsultation {
  id: string;
  patientName: string;
  patientAge: number;
  reason: string;
  urgency: string;
  status: string;
  doctorId?: string;
  notes: string;
  diagnosis: string;
  prescriptions: string[];
  fee: number;
  scheduledAt: number;
  createdAt: number;
}
