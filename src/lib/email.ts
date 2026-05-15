import { createMimeMessage } from 'mimetext';

export interface InvitationEmailParams {
  partyTitle: string;
  eventDate: string;
  location: string | null;
  description: string | null;
  rsvpUrl: string;
  organizerName: string;
  imageUrl: string | null;
}

export interface EmailContent {
  subject: string;
  html: string;
}

export function buildInvitationEmail(params: InvitationEmailParams): EmailContent {
  const subject = `You're invited to ${params.partyTitle}!`;
  const dateStr = new Date(params.eventDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  ${params.imageUrl ? `<img src="${params.imageUrl}" alt="Party cover" style="width:100%;border-radius:12px;margin-bottom:24px">` : ''}
  <h1 style="font-size:28px;margin-bottom:8px">${params.partyTitle}</h1>
  <p style="color:#555;font-size:16px">${params.organizerName} invited you to a party!</p>
  <table style="margin:24px 0;border-collapse:collapse;width:100%">
    <tr><td style="padding:8px 0;color:#888;width:100px">When</td><td style="padding:8px 0">${dateStr}</td></tr>
    ${params.location ? `<tr><td style="padding:8px 0;color:#888">Where</td><td style="padding:8px 0">${params.location}</td></tr>` : ''}
    ${params.description ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top">Details</td><td style="padding:8px 0">${params.description}</td></tr>` : ''}
  </table>
  <a href="${params.rsvpUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:18px;font-weight:bold">
    RSVP Now
  </a>
  <p style="margin-top:24px;color:#aaa;font-size:12px">Powered by <a href="https://github.com/evite-os/evite-os">evite-os</a></p>
</body>
</html>`;

  return { subject, html };
}

export function buildMagicLinkEmail(manageUrl: string): EmailContent {
  const subject = 'Your evite-os management link';
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2>Your party management link</h2>
  <p>Click below to access your party dashboard. This link expires in 24 hours.</p>
  <a href="${manageUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px">
    Open Dashboard
  </a>
  <p style="margin-top:24px;color:#aaa;font-size:12px">Bookmark the link after opening — magic links are one-time use.</p>
</body>
</html>`;

  return { subject, html };
}

export async function sendEmail(
  emailBinding: SendEmail,
  from: string,
  to: string,
  content: EmailContent
): Promise<void> {
  const msg = createMimeMessage();
  msg.setSender(from);
  msg.setRecipient(to);
  msg.setSubject(content.subject);
  msg.addMessage({ contentType: 'text/html', data: content.html });

  // EmailMessage is a Cloudflare Workers runtime global
  // @ts-expect-error — cloudflare:email not available at compile time
  const { EmailMessage } = await import('cloudflare:email');
  const message = new EmailMessage(from, to, msg.asRaw());
  await emailBinding.send(message);
}
