
// TypeScript definitions for Gmail webhook payloads
export interface GmailNotification {
  emailAddress: string;
  data: string;
  headers: {
    [key: string]: string;
  };
}

export interface GmailMessageChanged {
  type: 'MESSAGE_CHANGED';
  payload: {
    message: {
      id: string;
      labelIds: string[];
      threadId: string;
    };
  };
}

export interface GmailLabelAdded {
  type: 'LABEL_ADDED';
  payload: {
    label: {
      id: string;
      name: string;
      type: string;
    };
    message: {
      id: string;
      threadId: string;
    };
  };
}

export interface GmailLabelRemoved {
  type: 'LABEL_REMOVED';
  payload: {
    label: {
      id: string;
      name: string;
      type: string;
    };
    message: {
      id: string;
      threadId: string;
    };
  };
}

export type GmailNotificationPayload = GmailMessageChanged | GmailLabelAdded | GmailLabelRemoved;
