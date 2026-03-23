export const NOTIFICATION_TYPES = Object.freeze({
    MESSAGE: "message",
    APPLICATION_STATUS: "application_status",
    JOB_ALERT: "job_alert",
    SYSTEM: "system",
});

export const APPLICATION_STATUS_NOTIFICATION_STATUSES = new Set([
    "applied",
    "screening",
    "interviewing",
    "shortlisted",
    "offer",
    "rejected",
    "hired",
    "archived",
]);
