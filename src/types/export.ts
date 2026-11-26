export type ExportPrivacyMode = 'MASKED_SAFE' | 'UNMASKED_LOCAL';

export type ExportShareChannel = 'GMAIL' | 'WHATSAPP' | 'CLIPBOARD' | 'MARKDOWN_FILE';

export interface FormattedSharePayload {
  mode: ExportPrivacyMode;
  subject: string;
  bodyText: string;
  maskedEntityCount: number;
  characterCount: number;
  gmailComposeUrl: string;
  whatsappShareUrl: string;
}

