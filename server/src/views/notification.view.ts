export function toNotification(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: Date;
  readAt: Date | null;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
  };
}
