export interface SIPConfig {
  displayName: string;
  uri: string;
  authUsername: string;
  password: string;
  wsServer: string;
  stunServers: string;
}

export interface CallSession {
  id: string;
  direction: 'incoming' | 'outgoing';
  remoteIdentity: string;
  status: 'connecting' | 'ringing' | 'answered' | 'ended' | 'failed';
  startTime?: Date;
  endTime?: Date;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'registered' | 'error';
