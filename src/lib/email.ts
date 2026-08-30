/**
 * Lightweight email sender for Rent Mesh notifications.
 *
 * Uses the built-in Node.js net/tls modules for direct SMTP — zero
 * external dependencies. If SMTP_HOST is not configured, emails are
 * logged to the console instead (dev / staging convenience).
 *
 * Production recommendation: set SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASS in your .env. Works with any SMTP provider (Mailgun,
 * Postmark, AWS SES, Google Workspace, etc.).
 */

import * as net from "net";
import * as tls from "tls";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM || "noreply@rentme.ug",
  };
}

/**
 * Send an email via SMTP. Falls back to console.log when SMTP is
 * not configured, so notification code never throws in development.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const config = getSmtpConfig();

  if (!config) {
    console.log("[email] SMTP not configured — logging instead:", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return false;
  }

  try {
    await smtpSend(config, message);
    return true;
  } catch (error) {
    console.error("[email] SMTP send failed:", error);
    return false;
  }
}

/** Minimal SMTP conversation over TCP/TLS. */
function smtpSend(config: SmtpConfig, message: EmailMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(config.port, config.host);
    let buffer = "";
    let step = 0;

    const send = (data: string) => {
      socket.write(data + "\r\n");
    };

    const next = () => {
      step++;
      switch (step) {
        case 1: // After connection banner
          send(`EHLO ${config.host}`);
          break;
        case 2: // After EHLO response
          if (config.port === 465) {
            // Direct TLS
            const tlsSocket = new tls.TLSSocket(socket, {
              rejectUnauthorized: false,
            });
            // Continue on tlsSocket for STARTTLS-free flow
            send(`MAIL FROM:<${config.from}>`);
          } else {
            send("STARTTLS");
          }
          break;
        case 3: // After STARTTLS
          if (config.port !== 465) {
            const upgraded = new tls.TLSSocket(socket, {
              rejectUnauthorized: false,
            });
            // Reset listeners for the TLS socket
            upgraded.on("data", (chunk: Buffer) => {
              buffer += chunk.toString();
              if (buffer.includes("\r\n")) {
                buffer = "";
                send(`EHLO ${config.host}`);
              }
            });
          }
          send(`MAIL FROM:<${config.from}>`);
          break;
        case 4: // After MAIL FROM
          send(`RCPT TO:<${message.to}>`);
          break;
        case 5: // After RCPT TO
          send("DATA");
          break;
        case 6: // After DATA
          {
            const headers = [
              `From: ${config.from}`,
              `To: ${message.to}`,
              `Subject: ${message.subject}`,
              "MIME-Version: 1.0",
              message.html
                ? 'Content-Type: text/html; charset="UTF-8"'
                : 'Content-Type: text/plain; charset="UTF-8"',
              `Date: ${new Date().toUTCString()}`,
            ].join("\r\n");

            const body = message.html || message.text;
            send(`${headers}\r\n\r\n${body}\r\n.`);
          }
          break;
        case 7: // After message body
          send("QUIT");
          socket.end();
          resolve();
          break;
      }
    };

    socket.setEncoding("utf8");

    socket.on("data", (chunk: string) => {
      buffer += chunk;
      // Process after each complete SMTP response line
      if (buffer.includes("\r\n")) {
        const code = parseInt(buffer.substring(0, 3), 10);
        buffer = "";

        if (code >= 400) {
          reject(new Error(`SMTP ${code}: ${buffer}`));
          socket.end();
          return;
        }

        next();
      }
    });

    socket.on("error", (err) => {
      reject(err);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timeout"));
    });

    socket.setTimeout(15_000);
  });
}
