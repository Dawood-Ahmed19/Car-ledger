export function toDocument(doc: {
  id: string;
  type: string;
  state: string;
  originalName: string;
  mimeType: string;
  reviewNote: string | null;
  createdAt: Date;
}) {
  return {
    id: doc.id,
    type: doc.type,
    state: doc.state,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    reviewNote: doc.reviewNote,
    createdAt: doc.createdAt,
  };
}
