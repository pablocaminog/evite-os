export interface SmsBuildParams {
  organizerName: string;
  partyTitle: string;
  eventDate: string;
  rsvpUrl: string;
}

export function buildInvitationSms(params: SmsBuildParams): string {
  const date = new Date(params.eventDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return `${params.organizerName} invited you to "${params.partyTitle}" on ${date}. RSVP: ${params.rsvpUrl}`;
}

export async function sendSms(
  apiKey: string,
  from: string,
  to: string,
  text: string
): Promise<void> {
  const resp = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Telnyx error ${resp.status}: ${body}`);
  }
}
