// Cloud Function: sends a real email when a household invitation is saved.
// Triggered by writes to invitations/{email} in Firestore.
//
// Env vars (set with: firebase functions:secrets:set <NAME>)
//   RESEND_API_KEY  — from https://resend.com/api-keys
//   FROM_EMAIL      — (optional) verified sender address; defaults to Resend's test address

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.invitationEmail = onDocumentWritten("invitations/{email}", async (event) => {
  const change = event.data;
  // Skip deletes (accepting/declining an invite removes the doc).
  if (change.type === "delete") return;

  const invite = change.data.data();
  const to = invite.email;
  if (!to) return;

  const householdName = invite.householdName || "a household";
  const invitedBy = invite.invitedBy || "a household admin";
  const from = process.env.FROM_EMAIL || "Shopping List <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
      <div style="font-size: 40px; text-align: center;">🏠</div>
      <h2 style="text-align: center; font-size: 20px;">You've been invited to <strong>${householdName}</strong></h2>
      <p style="font-size: 15px; line-height: 1.5;">
        <strong>${invitedBy}</strong> invited you to share shopping lists on the Shopping List app.
      </p>
      <p style="font-size: 15px; line-height: 1.5;">
        Open the Shopping List app and sign in with this Google account.
        You'll see a <strong>"You've been invited"</strong> prompt there.
      </p>
      <p style="font-size: 13px; color: #888;">
        If you don't want to join, just ignore this email — the invitation expires on its own.
      </p>
    </div>`;

  const { data: result, error } = await resend.emails.send({
    from,
    to,
    subject: `You're invited to ${householdName} on Shopping List`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
  console.log(`Invitation email sent to ${to} (id: ${result?.id})`);
});
