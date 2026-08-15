// WhatsApp Notification Module
// =============================================================
// This is a READY-TO-CONNECT stub.
// To activate WhatsApp notifications, sign up for a provider:
//   - Twilio: https://www.twilio.com/whatsapp
//   - Wati: https://www.wati.io/
//   - 2Factor: https://2factor.in/
//
// Then set these environment variables in .env.local:
//   WHATSAPP_API_URL=...
//   WHATSAPP_API_KEY=...
//   WHATSAPP_SENDER_NUMBER=+91XXXXXXXXXX
//
// And replace the sendWhatsAppMessage function body with your
// provider's API call. No other code changes needed.
// =============================================================

interface WhatsAppPayload {
  to: string;      // Recipient phone number with country code, e.g. "+919876543210"
  message: string;
}

/**
 * Send a WhatsApp message to a student.
 * Currently a stub — connect a real provider to activate.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const senderNumber = process.env.WHATSAPP_SENDER_NUMBER;

  // If env vars not set, log and skip gracefully (don't crash)
  if (!apiUrl || !apiKey) {
    console.log("[WhatsApp] Provider not configured. Skipping:", { phone, message });
    return { success: false, error: "WhatsApp provider not configured." };
  }

  // Format phone number — ensure it starts with country code
  const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

  try {
    const payload: WhatsAppPayload = { to: formattedPhone, message };

    // ==============================================================
    // REPLACE THIS SECTION WITH YOUR PROVIDER'S API CALL
    // Example for a generic REST API:
    // ==============================================================
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // Adjust field names per your provider's documentation
        phone: payload.to,
        body: payload.message,
        from: senderNumber,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[WhatsApp] API error:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Pre-built message templates for common events.
 * Keeps messages consistent across the app.
 */
export const WhatsAppTemplates = {
  bookingConfirmed: (machine: string, slot: string, date: string) =>
    `✅ *Booking Confirmed!*\nMachine: ${machine}\nSlot: ${slot}\nDate: ${date}\n\n_Mewad Jain Hostel_`,

  bookingCancelled: (machine: string, slot: string, date: string, reason?: string) =>
    `❌ *Booking Cancelled*\nMachine: ${machine}\nSlot: ${slot}\nDate: ${date}${
      reason ? `\nReason: ${reason}` : ""
    }\n\n_Mewad Jain Hostel_`,

  maintenanceCancellation: (machine: string, slot: string, note?: string) =>
    `🔧 *Booking Cancelled — Maintenance*\nYour booking for *${machine}*, ${slot} has been cancelled because the machine is under maintenance.${
      note ? ` Note: ${note}` : ""
    }\n\n_Mewad Jain Hostel_`,
};
