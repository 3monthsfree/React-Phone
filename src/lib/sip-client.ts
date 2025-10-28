import JsSIP from 'jssip';
import type { SIPConfig } from '../types/sip';

// Enable debug logging
JsSIP.debug.enable('JsSIP:*');

export class SIPClient {
  private ua: JsSIP.UA | null = null;
  private currentSession: JsSIP.RTCSession | null = null;

  constructor(
    private config: SIPConfig,
    private onConnectionChange: (status: string) => void,
    private onCallStateChange: (state: string, session?: JsSIP.RTCSession) => void
  ) {}

  connect(): void {
    const socket = new JsSIP.WebSocketInterface(this.config.wsServer);
    
    const configuration = {
      sockets: [socket],
      uri: this.config.uri,
      password: this.config.password,
      display_name: this.config.displayName,
      register: true,
      register_expires: 120,
    };

    this.ua = new JsSIP.UA(configuration);

    // Connection events
    this.ua.on('connected', () => {
      console.log('UA connected');
      this.onConnectionChange('connected');
    });

    this.ua.on('disconnected', () => {
      console.log('UA disconnected');
      this.onConnectionChange('disconnected');
    });

    this.ua.on('registered', () => {
      console.log('UA registered');
      this.onConnectionChange('registered');
    });

    this.ua.on('unregistered', () => {
      console.log('UA unregistered');
      this.onConnectionChange('disconnected');
    });

    this.ua.on('registrationFailed', (e) => {
      console.error('Registration failed:', e);
      this.onConnectionChange('error');
    });

    // Call events
    this.ua.on('newRTCSession', (data) => {
      const session = data.session;
      this.currentSession = session;

      console.log('New RTC session:', session.direction);

      // Setup media handling
      session.on('peerconnection', (e) => {
        const pc = e.peerconnection;
        
        // Use modern ontrack instead of deprecated onaddstream
        pc.ontrack = (event) => {
          console.log('Remote track received:', event.track.kind);
          const audioElement = document.createElement('audio');
          audioElement.srcObject = event.streams[0];
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
        };
      });

      session.on('accepted', () => {
        console.log('Call accepted');
        this.onCallStateChange('answered', session);
      });

      session.on('progress', () => {
        console.log('Call in progress');
        this.onCallStateChange('ringing', session);
      });

      session.on('failed', (e) => {
        console.log('Call failed:', e.cause);
        this.onCallStateChange('failed', session);
        this.currentSession = null;
      });

      session.on('ended', (e) => {
        console.log('Call ended:', e.cause);
        this.onCallStateChange('ended', session);
        this.currentSession = null;
      });

      session.on('confirmed', () => {
        console.log('Call confirmed');
        this.onCallStateChange('answered', session);
      });

      // Handle incoming calls
      if (session.direction === 'incoming') {
        this.onCallStateChange('incoming', session);
      }
    });

    this.ua.start();
  }

  disconnect(): void {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
  }

  call(phoneNumber: string): void {
    if (!this.ua || !this.ua.isRegistered()) {
      throw new Error('Not registered');
    }

    const callOptions = {
      mediaConstraints: {
        audio: true,
        video: false,
      },
      pcConfig: {
        iceServers: this.parseStunServers(this.config.stunServers),
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
      },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
    };

    // Extract host from URI
    const host = this.config.uri.split('@')[1];
    const target = `sip:${phoneNumber}@${host}`;

    console.log('Calling:', target);
    this.ua.call(target, callOptions);
  }

  answer(): void {
    if (this.currentSession && this.currentSession.direction === 'incoming') {
      const callOptions = {
        mediaConstraints: {
          audio: true,
          video: false,
        },
        pcConfig: {
          iceServers: this.parseStunServers(this.config.stunServers),
          iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        },
      };

      this.currentSession.answer(callOptions);
    }
  }

  hangup(): void {
    if (this.currentSession) {
      this.currentSession.terminate();
      this.currentSession = null;
    }
  }

  isConnected(): boolean {
    return this.ua?.isConnected() ?? false;
  }

  isRegistered(): boolean {
    return this.ua?.isRegistered() ?? false;
  }

  private parseStunServers(stunConfig: string): RTCIceServer[] {
    const servers: RTCIceServer[] = [];
    const lines = stunConfig.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = line.split(',');
      const urls = parts[0].trim();
      
      if (parts.length === 3) {
        // TURN server with credentials
        servers.push({
          urls: [urls],
          username: parts[1].trim(),
          credential: parts[2].trim(),
        });
      } else {
        // STUN server
        servers.push({ urls: [urls] });
      }
    }

    return servers;
  }
}
