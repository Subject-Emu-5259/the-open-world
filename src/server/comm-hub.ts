// THE OPEN WORLD - Communication Hub
// Full in-game OS managing emails, SMS, calls, social media

export class CommHub {
  private emails: Email[] = [];
  private sms: SMSMessage[] = [];
  private calls: CallLog[] = [];
  private socialFeed: SocialPost[] = [];
  private voicemails: Voicemail[] = [];
  private notifications: Notification[] = [];
  private contacts: Contact[] = [];
  private drafts: { emails: EmailDraft[], sms: SMSDraft[] } = { emails: [], sms: [] };
  private groupChats: GroupChat[] = [];
  
  // === CONTACTS ===
  addContact(contact: Contact): void {
    if (!this.contacts.find(c => c.id === contact.id)) {
      this.contacts.push(contact);
    }
  }

  getContacts(): Contact[] {
    return this.contacts.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Send email (formal/business communication)
  sendEmail(to: string, subject: string, body: string, from: string = 'player'): Email {
    const email: Email = {
      id: `email_${Date.now()}`,
      from,
      to,
      subject,
      body,
      timestamp: Date.now(),
      read: false,
      starred: false,
    };
    this.emails.push(email);
    return email;
  }
  
  // Receive email from NPCs/businesses
  receiveEmail(from: string, fromName: string, subject: string, body: string, attachment?: Attachment): Email {
    const email: Email = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from,
      fromName,
      to: 'player',
      subject,
      body,
      timestamp: Date.now(),
      read: false,
      starred: false,
      attachment,
    };
    this.emails.push(email);
    return email;
  }
  
  // Send SMS (casual communication)
  sendSMS(to: string, message: string, attachment?: Attachment): SMSMessage {
    const sms: SMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: 'player',
      to,
      message,
      timestamp: Date.now(),
      read: true,
      starred: false,
      attachment,
    };
    this.sms.push(sms);
    return sms;
  }
  
  // Receive SMS from NPCs
  receiveSMS(from: string, fromName: string, message: string, attachment?: Attachment): SMSMessage {
    const sms: SMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from,
      fromName,
      to: 'player',
      message,
      timestamp: Date.now(),
      read: false,
      starred: false,
      attachment,
    };
    this.sms.push(sms);
    return sms;
  }
  
  // Log phone call
  logCall(contact: string, contactName: string, duration: number, type: 'incoming' | 'outgoing'): CallLog {
    const call: CallLog = {
      id: `call_${Date.now()}`,
      contact,
      contactName,
      duration,
      type,
      timestamp: Date.now(),
    };
    this.calls.push(call);
    return call;
  }
  
  // Add to social feed (Twitter/X style)
  addPost(author: string, authorHandle: string, content: string, platform: 'twitter' | 'instagram' | 'facebook'): SocialPost {
    const post: SocialPost = {
      id: `post_${Date.now()}`,
      author,
      authorHandle,
      content,
      platform,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      timestamp: Date.now(),
    };
    this.socialFeed.unshift(post); // Newest first
    return post;
  }
  
  // Get unread counts
  getUnreadCounts(): { emails: number; sms: number; voicemails: number } {
    return {
      emails: this.emails.filter(e => !e.read).length,
      sms: this.sms.filter(s => !s.read).length,
      voicemails: this.voicemails.filter(v => !v.listened).length,
    };
  }
  
  // Get inbox
  getEmails(): Email[] {
    return this.emails.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // Get SMS threads
  getMessages(): SMSMessage[] {
    return this.sms.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // Get call history
  getCalls(limit: number = 10): CallLog[] {
    return this.calls.slice(-limit).reverse();
  }
  
  // Get social feed
  getSocialFeed(limit: number = 20): SocialPost[] {
    return this.socialFeed.slice(0, limit);
  }
  
  // New: Compose email
  composeEmail(from: string, toName: string, subject: string, body: string): Email | null {
    // Find recipient by name (placeholder logic, usually handled by GameEngine)
    const email: Email = {
      id: `email_${Date.now()}`,
      from,
      to: toName.toLowerCase().replace(/\s+/g, '_'),
      fromName: 'Player',
      subject,
      body,
      timestamp: Date.now(),
      read: true,
      starred: false,
    };
    this.emails.push(email);
    return email;
  }

  // Get email by ID
  getEmailById(id: string): Email | undefined {
    return this.emails.find(e => e.id === id);
  }

  // Delete email
  deleteEmail(id: string): boolean {
    const index = this.emails.findIndex(e => e.id === id);
    if (index !== -1) {
      this.emails.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get SMS by ID
  getSMSById(id: string): SMSMessage | undefined {
    return this.sms.find(s => s.id === id);
  }

  // Delete SMS
  deleteSMS(id: string): boolean {
    const index = this.sms.findIndex(s => s.id === id);
    if (index !== -1) {
      this.sms.splice(index, 1);
      return true;
    }
    return false;
  }

  // Mark all as read
  markAllEmailsRead(): void {
    this.emails.forEach(e => e.read = true);
  }

  markAllSMSRead(): void {
    this.sms.forEach(s => s.read = true);
  }

  // Get phone state
  getPhoneState(): { notifications: Notification[] } {
    return {
      notifications: this.notifications.slice(-10),
    };
  }
  
  // Mark as read
  markEmailRead(id: string): void {
    const email = this.emails.find(e => e.id === id);
    if (email) email.read = true;
  }
  
  markSMSRead(id: string): void {
    const sms = this.sms.find(s => s.id === id);
    if (sms) sms.read = true;
  }

  receiveVoicemail(from: string, fromName: string, transcript: string, audioUrl?: string): Voicemail {
    const voicemail: Voicemail = {
      id: `vm_${Date.now()}`,
      from,
      fromName,
      transcript,
      audioUrl,
      timestamp: Date.now(),
      listened: false,
    };
    this.voicemails.push(voicemail);
    return voicemail;
  }

  getVoicemails(): Voicemail[] {
    return this.voicemails.sort((a, b) => b.timestamp - a.timestamp);
  }

  addNotification(type: string, message: string): void {
    this.notifications.push({
      id: `notif_${Date.now()}`,
      type,
      message,
      timestamp: Date.now(),
      read: false,
    });
  }

  // === GROUP CHATS ===
  createGroupChat(id: string, name: string, members: string[]): void {
    if (!this.groupChats.find(g => g.id === id)) {
      this.groupChats.push({ id, name, members, messages: [] });
    }
  }

  joinGroupChat(id: string, memberId: string = 'player'): void {
    const group = this.groupChats.find(g => g.id === id);
    if (group && !group.members.includes(memberId)) {
      group.members.push(memberId);
      this.addNotification('Group Chat', `You were added to ${group.name}`);
    }
  }

  sendGroupMessage(groupId: string, from: string, message: string): void {
    const group = this.groupChats.find(g => g.id === groupId);
    if (group) {
      group.messages.push({
        from,
        message,
        timestamp: Date.now()
      });
      // Limit message history to 50
      if (group.messages.length > 50) group.messages.shift();
    }
  }

  getGroupChat(id: string): GroupChat | undefined {
    return this.groupChats.find(g => g.id === id);
  }

  getGroupChats(): GroupChat[] {
    return this.groupChats;
  }

  // === SEARCH ===
  searchComm(query: string): { emails: Email[], sms: SMSMessage[] } {
    const q = query.toLowerCase();
    return {
      emails: this.emails.filter(e => 
        e.subject.toLowerCase().includes(q) || 
        e.body.toLowerCase().includes(q) || 
        e.fromName?.toLowerCase().includes(q)
      ),
      sms: this.sms.filter(s => 
        s.message.toLowerCase().includes(q) || 
        s.fromName?.toLowerCase().includes(q)
      )
    };
  }

  // === DRAFTS ===
  saveEmailDraft(draft: EmailDraft): void {
    const index = this.drafts.emails.findIndex(d => d.id === draft.id);
    if (index !== -1) this.drafts.emails[index] = draft;
    else this.drafts.emails.push({ ...draft, id: `draft_${Date.now()}` });
  }

  getEmailDrafts(): EmailDraft[] {
    return this.drafts.emails;
  }
}

interface Attachment {
  type: 'money' | 'item' | 'location' | 'contact';
  value: any;
  label: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  isFavorite: boolean;
}

interface Email {
  id: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  starred: boolean;
  attachment?: Attachment;
}

interface SMSMessage {
  id: string;
  from: string;
  fromName?: string;
  to: string;
  message: string;
  content?: string;
  timestamp: number;
  read: boolean;
  starred: boolean;
  attachment?: Attachment;
}

interface EmailDraft {
  id?: string;
  to: string;
  subject: string;
  body: string;
  attachment?: Attachment;
}

interface SMSDraft {
  id?: string;
  to: string;
  message: string;
}

interface GroupChat {
  id: string;
  name: string;
  members: string[]; // NPC IDs
  messages: { from: string, message: string, timestamp: number }[];
}

interface CallLog {
  id: string;
  contact: string;
  contactName: string;
  duration: number;
  type: 'incoming' | 'outgoing';
  timestamp: number;
}

interface Voicemail {
  id: string;
  from: string;
  fromName: string;
  transcript: string;
  audioUrl?: string;
  timestamp: number;
  listened: boolean;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface SocialPost {
  id: string;
  author: string;
  authorHandle: string;
  content: string;
  platform: 'twitter' | 'instagram' | 'facebook';
  likes: number;
  comments: number;
  shares: number;
  timestamp: number;
}

// Generate initial NPC messages
export function generateInitialMessages(comm: CommHub): void {
  // Welcome email
  comm.receiveEmail(
    'admin@westmemphis.gov',
    'West Memphis City Services',
    'Welcome to West Memphis!',
    `Welcome to West Memphis, Arkansas!\n\nYour new life begins here. The city offers various opportunities for employment, education, and community engagement.\n\nVisit the Job Center downtown to explore career options.\n\n- West Memphis City Hall`,
    undefined
  );
  
  // SMS from Uncle Ray
  comm.receiveSMS(
    'npc_006',
    'Uncle Ray',
    "Welcome to the neighborhood, nephew. Come by the community center when you get a chance. Got some wisdom to share.",
    undefined
  );
  
  // Social post
  comm.addPost(
    'DJ Metro',
    '@djmetro901',
    'New face in the city! Welcome to West Memphis. Hit me up if you tryna get into the nightlife scene. 🔊🎶 #901 #WestMemphis',
    'twitter'
  );
}
