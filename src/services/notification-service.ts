
import { Resend } from "resend";
import twilio from "twilio";
import { db } from "@/db";
import { user, leagueMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import logger from "@/lib/logger";

export class NotificationService {
    private resend: Resend | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private twilioClient: any = null; // Twilio types are tricky to import correctly without installing explicit types package, keeping any for now.
    private emailFrom: string;
    private smsFrom: string;

    constructor() {
        if (process.env.RESEND_API_KEY) {
            this.resend = new Resend(process.env.RESEND_API_KEY);
        }

        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }

        this.emailFrom = process.env.EMAIL_FROM || "notifications@golf-league-app.com";
        this.smsFrom = process.env.TWILIO_PHONE_NUMBER || "+1234567890";
    }

    private async sendEmail(to: string, subject: string, html: string) {
        if (!this.resend) {
            logger.info({ to, subject }, "EMAIL MOCKED: Resend Key missing");
            return;
        }
        try {
            await this.resend.emails.send({
                from: this.emailFrom,
                to,
                subject,
                html,
            });
            logger.info({ to }, "Email sent");
        } catch (error) {
            logger.error({ error, to }, "Failed to send email");
        }
    }

    private async sendSms(to: string, body: string) {
        if (!this.twilioClient) {
            logger.info({ to, body }, "SMS MOCKED: Twilio Client missing");
            return;
        }
        try {
            await this.twilioClient.messages.create({
                body,
                from: this.smsFrom,
                to,
            });
            logger.info({ to }, "SMS sent");
        } catch (error) {
            logger.error({ error, to }, "Failed to send SMS");
        }
    }

    private async dispatch(userId: string, title: string, message: string, html?: string) {
        const [recipient] = await db
            .select({
                email: user.email,
                phone: user.phone,
                pref: user.notificationPreference,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (!recipient) {
            logger.warn({ userId }, "Notification failed: User not found");
            return;
        }

        if (recipient.pref === "sms" && recipient.phone) {
            await this.sendSms(recipient.phone, `${title}: ${message}`);
        } else {
            await this.sendEmail(recipient.email, title, html || message);
        }
    }

    /**
     * Notify all subs in a league that a request has been made.
     */
    async broadcastSubRequest(organizationId: string, matchDate: Date, note: string) {
        const subs = await db
            .select({ userId: leagueMembers.userId })
            .from(leagueMembers)
            .where(
                and(
                    eq(leagueMembers.organizationId, organizationId),
                    eq(leagueMembers.role, "sub")
                )
            );

        await this.sendSubRequest(subs.map(s => s.userId), matchDate, note);
    }

    /**
     * Notify specific users about a sub request
     */
    async sendSubRequest(userIds: string[], matchDate: Date, note: string) {
        const dateStr = matchDate.toLocaleDateString();
        const message = `A sub is needed for a match on ${dateStr}. Note: ${note}`;

        for (const userId of userIds) {
            await this.dispatch(
                userId,
                "Sub Request",
                message
            );
        }
    }

    /**
     * Notify a user that their sub request was accepted.
     */
    async notifySubAccepted(userId: string, subName: string) {
        await this.dispatch(
            userId,
            "Sub Found!",
            `Your sub request has been accepted by ${subName}.`
        );
    }
}

export const notificationService = new NotificationService();
