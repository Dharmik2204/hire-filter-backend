import { jest } from "@jest/globals";

const mockGetNotificationsByUserId = jest.fn();
const mockCountNotificationsByUserId = jest.fn();
const mockMarkNotificationAsRead = jest.fn();
const mockMarkAllNotificationsAsRead = jest.fn();
const mockDeleteNotification = jest.fn();
const mockGetUnreadCount = jest.fn();

jest.unstable_mockModule("../repositories/notification.repository.js", () => ({
    getNotificationsByUserId: mockGetNotificationsByUserId,
    countNotificationsByUserId: mockCountNotificationsByUserId,
    markNotificationAsRead: mockMarkNotificationAsRead,
    markAllNotificationsAsRead: mockMarkAllNotificationsAsRead,
    deleteNotification: mockDeleteNotification,
    getUnreadCount: mockGetUnreadCount,
}));

const { getNotifications } = await import("../controllers/notification.js");

const createMockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.payload = null;
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((body) => {
        res.payload = body;
        return res;
    });
    return res;
};

describe("Notification Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should default to unread notifications", async () => {
        mockGetNotificationsByUserId.mockResolvedValue([{ _id: "n1", isRead: false }]);
        mockCountNotificationsByUserId.mockResolvedValue(120);
        mockGetUnreadCount.mockResolvedValue(1);

        const req = {
            user: { _id: "user-1" },
            query: {},
        };
        const res = createMockRes();

        await getNotifications(req, res);

        expect(mockGetNotificationsByUserId).toHaveBeenCalledWith("user-1", 1, 50, "unread");
        expect(mockCountNotificationsByUserId).toHaveBeenCalledWith("user-1", "unread");
        expect(mockGetUnreadCount).toHaveBeenCalledWith("user-1");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.payload?.data?.status).toBe("unread");
        expect(res.payload?.data?.totalPages).toBe(3);
        expect(res.payload?.data?.hasNextPage).toBe(true);
    });

    it("should return all notifications when status=all", async () => {
        mockGetNotificationsByUserId.mockResolvedValue([
            { _id: "n1", isRead: false },
            { _id: "n2", isRead: true },
        ]);
        mockCountNotificationsByUserId.mockResolvedValue(15);
        mockGetUnreadCount.mockResolvedValue(1);

        const req = {
            user: { _id: "user-1" },
            query: { status: "all", page: "2", limit: "10" },
        };
        const res = createMockRes();

        await getNotifications(req, res);

        expect(mockGetNotificationsByUserId).toHaveBeenCalledWith("user-1", 2, 10, "all");
        expect(mockCountNotificationsByUserId).toHaveBeenCalledWith("user-1", "all");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.payload?.data?.status).toBe("all");
        expect(res.payload?.data?.totalPages).toBe(2);
        expect(res.payload?.data?.hasNextPage).toBe(false);
    });

    it("should return read notifications when status=read", async () => {
        mockGetNotificationsByUserId.mockResolvedValue([{ _id: "n2", isRead: true }]);
        mockCountNotificationsByUserId.mockResolvedValue(1);
        mockGetUnreadCount.mockResolvedValue(0);

        const req = {
            user: { _id: "user-1" },
            query: { status: "read" },
        };
        const res = createMockRes();

        await getNotifications(req, res);

        expect(mockGetNotificationsByUserId).toHaveBeenCalledWith("user-1", 1, 50, "read");
        expect(mockCountNotificationsByUserId).toHaveBeenCalledWith("user-1", "read");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.payload?.data?.status).toBe("read");
    });

    it("should reject invalid status values", async () => {
        const req = {
            user: { _id: "user-1" },
            query: { status: "new" },
        };
        const res = createMockRes();

        await getNotifications(req, res);

        expect(mockGetNotificationsByUserId).not.toHaveBeenCalled();
        expect(mockCountNotificationsByUserId).not.toHaveBeenCalled();
        expect(mockGetUnreadCount).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.payload?.message).toBe("Validation failed");
        expect(res.payload?.errors?.length).toBeGreaterThan(0);
    });

    it("should clamp page and limit like message pagination", async () => {
        mockGetNotificationsByUserId.mockResolvedValue([]);
        mockCountNotificationsByUserId.mockResolvedValue(0);
        mockGetUnreadCount.mockResolvedValue(0);

        const req = {
            user: { _id: "user-1" },
            query: { page: "0", limit: "200" },
        };
        const res = createMockRes();

        await getNotifications(req, res);

        expect(mockGetNotificationsByUserId).toHaveBeenCalledWith("user-1", 1, 100, "unread");
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
