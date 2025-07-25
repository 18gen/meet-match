import { google } from 'googleapis';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );
  }

  // Initialize Google OAuth flow
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Set credentials for authenticated requests
  setCredentials(tokens: { access_token: string; refresh_token?: string }) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Get user's calendar events
  async getEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<GoogleCalendarEvent[]> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      });

      return response.data.items?.map(event => ({
        id: event.id || '',
        summary: event.summary || 'No Title',
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone
        },
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email || '',
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      })) || [];
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw new Error('カレンダーイベントの取得に失敗しました');
    }
  }

  // Create a calendar event
  async createEvent(
    accessToken: string,
    event: {
      summary: string;
      description?: string;
      start: { dateTime: string };
      end: { dateTime: string };
      attendees?: Array<{ email: string }>;
    }
  ): Promise<GoogleCalendarEvent> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });

      return {
        id: response.data.id || '',
        summary: response.data.summary || '',
        start: {
          dateTime: response.data.start?.dateTime || '',
          timeZone: response.data.start?.timeZone
        },
        end: {
          dateTime: response.data.end?.dateTime || '',
          timeZone: response.data.end?.timeZone
        }
      };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw new Error('カレンダーイベントの作成に失敗しました');
    }
  }
}
