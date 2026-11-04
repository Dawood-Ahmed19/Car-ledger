import * as DocumentPicker from "expo-document-picker";
import { api } from "@/lib/api";

export type PickedDoc = { uri: string; name: string; type: string };

export async function pickDocument(): Promise<PickedDoc | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });
  if (res.canceled) return null;
  const a = res.assets[0];
  const type =
    a.mimeType === "image/jpg"
      ? "image/jpeg"
      : (a.mimeType ?? "application/octet-stream");
  return { uri: a.uri, name: a.name, type };
}

export function uploadEvidence(
  listingId: string,
  type: string,
  doc: PickedDoc,
) {
  const form = new FormData();
  form.append("file", {
    uri: doc.uri,
    name: doc.name,
    type: doc.type,
  } as unknown as Blob);
  return api(`/api/listings/${listingId}/evidence/${type}`, {
    method: "POST",
    body: form,
  });
}
