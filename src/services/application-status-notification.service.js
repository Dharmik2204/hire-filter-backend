import {
    getOrCreateConversation,
    createMessage,
    updateConversationLastMessage,
} from "../repositories/message.repository.js";
import { findUsersByRoles } from "../repositories/user.repository.js";
import { NOTIFICATION_TYPES, APPLICATION_STATUS_NOTIFICATION_STATUSES } from "../constants/notification.constants.js";
import { createAndDispatchNotification, createAndDispatchBulkNotifications } from "./notification-dispatcher.service.js";

const STATUS_LABELS = {
    applied: "Applied",
    screening: "Screening",
    interviewing: "Interviewing",
    shortlisted: "Shortlisted",
    offer: "Offer",
    rejected: "Rejected",
    hired: "Hired",
    archived: "Archived",
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status;

const buildCandidateMessage = ({ status, jobTitle, companyName }) => {
    const messages = {
        applied: `Your application for ${jobTitle} at ${companyName} is now marked as applied.`,
        screening: `Your application for ${jobTitle} at ${companyName} is under screening.`,
        interviewing: `Your application for ${jobTitle} at ${companyName} has moved to the interviewing stage.`,
        shortlisted: `Great news! You have been shortlisted for ${jobTitle} at ${companyName}.`,
        offer: `Good news! An offer update is available for ${jobTitle} at ${companyName}.`,
        rejected: `Your application for ${jobTitle} at ${companyName} has been marked as rejected.`,
        hired: `Congratulations! You have been hired for ${jobTitle} at ${companyName}.`,
        archived: `Your application for ${jobTitle} at ${companyName} has been archived.`,
    };

    return messages[status] || `Your application status for ${jobTitle} at ${companyName} was updated to ${getStatusLabel(status)}.`;
};

export const notifyApplicationStatusChange = async ({
    applicationId,
    previousStatus,
    nextStatus,
    applicationDetails,
    actorUser,
}) => {
    if (previousStatus === nextStatus) return;
    if (!APPLICATION_STATUS_NOTIFICATION_STATUSES.has(nextStatus)) return;

    const candidateId = applicationDetails.user?._id?.toString?.() || applicationDetails.user?.toString?.();
    const candidateName = applicationDetails.user?.name || "Candidate";
    const jobId = applicationDetails.job?._id?.toString?.() || "";
    const jobTitle = applicationDetails.job?.jobTitle || "this position";
    const companyName = applicationDetails.job?.companyName || "the company";
    const jobOwnerId = applicationDetails.job?.createdBy?.toString?.() || "";

    const actorId = actorUser?._id?.toString?.() || "";
    const actorName = actorUser?.name || "HR/Admin";

    const statusLabel = getStatusLabel(nextStatus);
    const link = `/applications/${applicationId}`;
    const candidateMessage = buildCandidateMessage({ status: nextStatus, jobTitle, companyName });

    if (candidateId && actorId) {
        const conversation = await getOrCreateConversation(actorId, candidateId);
        const message = await createMessage({
            conversationId: conversation._id,
            sender: actorId,
            receiver: candidateId,
            content: candidateMessage,
            type: "notification",
        });
        await updateConversationLastMessage(conversation._id, message._id);

        await createAndDispatchNotification({
            recipient: candidateId,
            sender: actorId,
            title: `Application ${statusLabel}`,
            message: candidateMessage,
            type: NOTIFICATION_TYPES.APPLICATION_STATUS,
            link,
            metadata: {
                applicationId,
                jobId,
                previousStatus,
                status: nextStatus,
                audience: "candidate",
            },
            extraSocketPayload: {
                conversationId: conversation._id,
            },
        });
    }

    const adminUsers = await findUsersByRoles(["admin"], {
        excludeUserIds: candidateId ? [candidateId] : [],
    });
    const adminIds = adminUsers.map((admin) => admin._id.toString());

    const staffRecipientIds = Array.from(
        new Set([actorId, jobOwnerId, ...adminIds].filter(Boolean).filter((id) => id !== candidateId))
    );

    if (staffRecipientIds.length > 0) {
        await createAndDispatchBulkNotifications({
            recipientIds: staffRecipientIds,
            sender: actorId || undefined,
            title: `Application ${statusLabel}: ${candidateName}`,
            message: `${actorName} updated ${candidateName}'s application for ${jobTitle} to ${statusLabel}.`,
            type: NOTIFICATION_TYPES.APPLICATION_STATUS,
            link,
            metadata: {
                applicationId,
                jobId,
                previousStatus,
                status: nextStatus,
                candidateId,
                audience: "staff",
            },
        });
    }
};
