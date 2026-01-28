import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as OneSignal from 'onesignal-node';
import * as twilio from 'twilio';

@Injectable()
export class NotificationsService {
  private oneSignalClient: OneSignal.Client;
  private twilioClient: twilio.Twilio;

  constructor(private prisma: PrismaService) {
    // Initialize OneSignal
    this.oneSignalClient = new OneSignal.Client(
      process.env.ONESIGNAL_APP_ID,
      process.env.ONESIGNAL_REST_API_KEY,
    );

    // Initialize Twilio
    this.twilioClient = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  // Push Notification (PWA/Mobile)
  async sendPushNotification(data: {
    userIds?: string[];
    title: string;
    body: string;
    url?: string;
    data?: any;
  }) {
    try {
      // Get OneSignal player IDs for users
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: data.userIds },
          oneSignalPlayerId: { not: null },
        },
        select: { oneSignalPlayerId: true },
      });

      const playerIds = users
        .map((u) => u.oneSignalPlayerId)
        .filter(Boolean);

      if (playerIds.length === 0) {
        console.log('No users with push notification enabled');
        return { success: false, reason: 'no_players' };
      }

      const notification = {
        contents: { en: data.body },
        headings: { en: data.title },
        include_player_ids: playerIds,
        url: data.url || process.env.FRONTEND_URL,
        data: data.data || {},
        web_push_topic: 'health-sos-alerts',
        priority: 10,
        ttl: 3600, // 1 hour
        android_accent_color: 'FF6B9DFF',
        large_icon: '/icons/icon-192x192.png',
      };

      const response = await this.oneSignalClient.createNotification(
        notification,
      );
      
      // Save notification to database
      await this.saveNotifications(data.userIds, data.title, data.body, data.data);

      return { success: true, response };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // SMS Notification
  async sendSMS(to: string, message: string) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  // WhatsApp Notification
  async sendWhatsApp(to: string, message: string) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
      });
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('WhatsApp error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SOS Alert to Emergency Contacts
  async sendSOSAlert(sosData: {
    patientName: string;
    patientId: string;
    location: { latitude: number; longitude: number; address?: string };
    symptoms: string[];
    urgencyLevel: number;
  }) {
    // Get emergency contacts
    const contacts = await this.prisma.emergencyContact.findMany({
      where: { patientId: sosData.patientId },
      orderBy: { priority: 'asc' },
    });

    const smsMessage = `🚨 EMERGENCY SOS ALERT

${sosData.patientName} needs immediate help!

📍 Location: ${sosData.location.address || `${sosData.location.latitude}, ${sosData.location.longitude}`}
💊 Symptoms: ${sosData.symptoms.join(', ')}
⚠️ Urgency: ${sosData.urgencyLevel}/10

Please respond immediately!

View details: ${process.env.FRONTEND_URL}/sos/${sosData.patientId}`;

    const whatsappMessage = `🚨 *EMERGENCY SOS ALERT*

*${sosData.patientName}* needs immediate help!

📍 *Location:* ${sosData.location.address || `${sosData.location.latitude}, ${sosData.location.longitude}`}
💊 *Symptoms:* ${sosData.symptoms.join(', ')}
⚠️ *Urgency Level:* ${sosData.urgencyLevel}/10

⏰ Time: ${new Date().toLocaleString()}

*Please respond immediately!*

View details: ${process.env.FRONTEND_URL}/sos/${sosData.patientId}`;

    // Send notifications to all emergency contacts in parallel
    const notifications = contacts.map(async (contact) => {
      return Promise.allSettled([
        // Send SMS
        this.sendSMS(contact.phone, smsMessage),
        // Send WhatsApp
        this.sendWhatsApp(contact.phone, whatsappMessage),
      ]);
    });

    await Promise.all(notifications);

    // Also send push notification to patient
    await this.sendPushNotification({
      userIds: [sosData.patientId],
      title: '🚨 SOS Alert Sent',
      body: 'Your emergency contacts have been notified. Help is on the way!',
      data: { type: 'SOS_SENT' },
    });

    return { success: true, contactsNotified: contacts.length };
  }

  // Save notification to database
  private async saveNotifications(
    userIds: string[],
    title: string,
    body: string,
    data: any,
  ) {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: data?.type || 'GENERAL',
        title,
        body,
        data,
      })),
    });
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
