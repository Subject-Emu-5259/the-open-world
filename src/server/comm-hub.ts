// THE OPEN WORLD - Communication Hub
// Full in-game OS managing emails, SMS, calls, social media

export class CommHub {
  private emails: Email[] = [];
  private sms: SMSMessage[] = [];
  private calls: CallLog[] = [];
  private socialFeed: SocialPost[] = [];
  private voicemails: Voicemail[] = [];
  private notifications: Notification[] = [];
  
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
  receiveEmail(from: string, fromName: string, subject: string, body: string): Email {
    const email: Email = {
      id: `email_${Date.now()}`,
      from,
      fromName,
      to: 'player',
      subject,
      body,
      timestamp: Date.now(),
      read: false,
      starred: false,
    };
    this.emails.push(email);
    return email;
  }
  
  // Send SMS (casual communication)
  sendSMS(to: string, message: string): SMSMessage {
    const sms: SMSMessage = {
      id: `sms_${Date.now()}`,
      from: 'player',
      to,
      message,
      timestamp: Date.now(),
      read: true,
    };
    this.sms.push(sms);
    return sms;
  }
  
  // Receive SMS from NPCs
  receiveSMS(from: string, fromName: string, message: string): SMSMessage {
    const sms: SMSMessage = {
      id: `sms_${Date.now()}`,
      from,
      fromName,
      to: 'player',
      message,
      timestamp: Date.now(),
      read: false,
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
    `Welcome to West Memphis, Arkansas!\n\nYour new life begins here. The city offers various opportunities for employment, education, and community engagement.\n\nVisit the Job Center downtown to explore career options.\n\n- West Memphis City Hall`
  );
  
  // SMS from Uncle Ray
  comm.receiveSMS(
    'npc_006',
    'Uncle Ray',
    "Welcome to the neighborhood, nephew. Come by the community center when you get a chance. Got some wisdom to share."
  );
  
  // Social post
  comm.addPost(
    'DJ Metro',
    '@djmetro901',
    'New face in the city! Welcome to West Memphis. Hit me up if you tryna get into the nightlife scene. 🔊🎶 #901 #WestMemphis',
    'twitter'
  );
}
