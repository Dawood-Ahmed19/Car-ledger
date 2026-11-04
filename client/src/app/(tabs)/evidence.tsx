import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, assetUrl } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { pickDocument, uploadEvidence } from "@/lib/evidence";
import type { IconName } from "@/constants/vehicle";

type EvidenceListing = {
  id: string;
  title: string;
  priceLabel: string;
  city: string;
  status: string;
  evidence: string[];
  imageUrl?: string;
  photos?: string[];
};

type Doc = {
  id: string;
  type: string;
  state: "pending" | "approved" | "rejected";
  originalName: string;
  reviewNote: string | null;
};

const COLOR = {
  primary: "#004ac6",
  loader: "#2563eb",
  green: "#006242",
  slate: "#565e74",
  muted: "#434655",
  outline: "#737686",
  error: "#ba1a1a",
};

const DOCS: { key: string; label: string; hint: string; icon: IconName }[] = [
  {
    key: "registration",
    label: "Registration",
    hint: "Proof the car is registered in the owner's name.",
    icon: "description",
  },
  {
    key: "inspection",
    label: "Inspection report",
    hint: "A mechanic or inspection company's report.",
    icon: "fact-check",
  },
  {
    key: "service",
    label: "Service history",
    hint: "Records of past servicing and repairs.",
    icon: "build-circle",
  },
  {
    key: "owner_cnic",
    label: "Owner CNIC",
    hint: "Confirms the seller's identity matches the owner.",
    icon: "badge",
  },
];

const DOC_STATE = {
  pending: { label: "In review", color: COLOR.slate, bg: "bg-[#dae2fd]" },
  approved: { label: "Approved", color: COLOR.green, bg: "bg-[#006242]/10" },
  rejected: { label: "Rejected", color: COLOR.error, bg: "bg-[#ffdad6]" },
} as const;

const STATUS: Record<
  string,
  { label: string; icon: IconName; color: string; bg: string; text: string }
> = {
  verified: {
    label: "Verified",
    icon: "verified",
    color: COLOR.green,
    bg: "bg-[#006242]/10",
    text: "The evidence for this car has been checked and approved.",
  },
  under_review: {
    label: "Under review",
    icon: "pending-actions",
    color: COLOR.slate,
    bg: "bg-[#dae2fd]",
    text: "The evidence is being checked. The status will change when the review is done.",
  },
  not_checked: {
    label: "Not yet checked",
    icon: "help-outline",
    color: COLOR.slate,
    bg: "bg-[#e5eeff]",
    text: "Nobody has checked this car's documents yet. Treat them as the seller's claims.",
  },
  recalled: {
    label: "Recalled",
    icon: "warning-amber",
    color: COLOR.error,
    bg: "bg-[#ffdad6]",
    text: "A problem was found with this listing's evidence. Be careful before going ahead.",
  },
};

const statusOf = (s: string) => STATUS[s] ?? STATUS.not_checked;

/* ---------- shared pieces ---------- */

function StatusBadge({ status }: { status: string }) {
  const s = statusOf(status);
  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${s.bg}`}>
      <MaterialIcons name={s.icon} size={13} color={s.color} />
      <Text style={{ color: s.color }} className="text-[11px] font-bold">
        {s.label}
      </Text>
    </View>
  );
}

function TitleBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="px-4 pt-3 pb-3 bg-white shadow-sm">
      <Text className="text-[18px] font-semibold text-[#0b1c30]">{title}</Text>
      <Text className="text-[13px] text-[#434655] mt-0.5">{subtitle}</Text>
    </View>
  );
}

/* ---------- seller view ---------- */

function SellerEvidence() {
  const [items, setItems] = useState<EvidenceListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    mode === "refresh" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { listings } = await api<{ listings: EvidenceListing[] }>(
        "/api/listings/mine",
      );
      setItems(listings ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't load your listings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = items.find((i) => i.id === selectedId) ?? items[0];

  return (
    <ScrollView
      className="flex-1 bg-[#f8f9ff]"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load("refresh")}
        />
      }
    >
      <TitleBar
        title="Evidence"
        subtitle="The documents you uploaded for each of your cars"
      />

      {loading ? (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color={COLOR.loader} />
        </View>
      ) : error ? (
        <View className="py-16 px-8 items-center gap-3">
          <MaterialIcons name="error-outline" size={36} color={COLOR.error} />
          <Text className="text-center text-[14px] text-[#434655]">
            {error}
          </Text>
          <Pressable
            onPress={() => load()}
            className="px-4 py-2 rounded-lg bg-[#2563eb]"
          >
            <Text className="text-xs font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : !current ? (
        <View className="py-16 px-8 items-center gap-2">
          <MaterialIcons name="folder-open" size={36} color={COLOR.outline} />
          <Text className="text-[16px] font-semibold text-[#0b1c30]">
            No listings yet
          </Text>
          <Text className="text-center text-[13px] text-[#434655]">
            Post a car and its evidence will show up here.
          </Text>
        </View>
      ) : (
        <>
          {/* Listing picker */}
          {items.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              {items.map((i) => {
                const active = i.id === current.id;
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => setSelectedId(i.id)}
                    className={`px-3.5 py-2 rounded-lg shadow-sm ${
                      active ? "bg-[#2563eb]" : "bg-white"
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-xs font-semibold max-w-[180px] ${
                        active ? "text-white" : "text-[#434655]"
                      }`}
                    >
                      {i.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <SellerDetail
            key={current.id}
            item={current}
            onChanged={() => load("refresh")}
          />
        </>
      )}
    </ScrollView>
  );
}

function SellerDetail({
  item,
  onChanged,
}: {
  item: EvidenceListing;
  onChanged: () => void;
}) {
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const { documents } = await api<{ documents: Doc[] }>(
        `/api/listings/${item.id}/evidence`,
      );
      setDocs(Object.fromEntries(documents.map((d) => [d.type, d])));
    } catch {}
  }, [item.id]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  async function attach(key: string) {
    setErr(null);
    const picked = await pickDocument();
    if (!picked) return;
    setBusyKey(key);
    try {
      await uploadEvidence(item.id, key, picked);
      await loadDocs();
      onChanged(); // refresh the listing's status
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusyKey(null);
    }
  }

  const uploaded = Object.keys(docs).length;
  const approved = Object.values(docs).filter(
    (d) => d.state === "approved",
  ).length;
  const status = statusOf(item.status);
  const path = item.imageUrl ?? item.photos?.[0];
  const uri = path ? assetUrl(path) : undefined;

  return (
    <View className="px-4 pt-3 gap-4">
      {/* Vehicle banner */}
      <View className="bg-white rounded-xl p-3 shadow-sm flex-row gap-3 items-center">
        <View className="w-16 h-16 rounded-lg bg-[#dce9ff] overflow-hidden items-center justify-center">
          {uri ? (
            <Image
              source={{ uri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons
              name="directions-car"
              size={28}
              color={COLOR.outline}
            />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-semibold text-[#0b1c30]"
          >
            {item.title}
          </Text>
          <Text className="text-[12px] text-[#434655]">
            {item.city} · {item.priceLabel}
          </Text>
          <View className="flex-row">
            <StatusBadge status={item.status} />
          </View>
        </View>
      </View>

      {/* Documents */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[18px] font-semibold text-[#0b1c30]">
            Documents
          </Text>
          <Text
            className="text-xs font-semibold"
            style={{ color: approved === 4 ? COLOR.green : COLOR.slate }}
          >
            {approved}/4 approved · {uploaded}/4 uploaded
          </Text>
        </View>

        {err ? (
          <Text className="text-xs text-[#ba1a1a] mb-2">{err}</Text>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {DOCS.map((d) => {
            const doc = docs[d.key];
            const st = doc ? DOC_STATE[doc.state] : null;
            const busy = busyKey === d.key;
            return (
              <View
                key={d.key}
                style={{ width: "48.5%" }}
                className="bg-white p-3 rounded-xl shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center ${
                      st ? st.bg : "bg-[#e5eeff]"
                    }`}
                  >
                    <MaterialIcons
                      name={d.icon}
                      size={16}
                      color={st ? st.color : COLOR.outline}
                    />
                  </View>
                  <View
                    className={`px-1.5 py-0.5 rounded ${st ? st.bg : "bg-[#e5eeff]"}`}
                  >
                    <Text
                      style={{ color: st ? st.color : COLOR.slate }}
                      className="text-[10px] font-bold uppercase"
                    >
                      {st ? st.label : "Missing"}
                    </Text>
                  </View>
                </View>

                <Text className="text-[14px] font-semibold text-[#0b1c30]">
                  {d.label}
                </Text>
                <Text
                  numberOfLines={2}
                  className="text-[12px] text-[#434655] mt-1"
                >
                  {doc?.state === "rejected" && doc.reviewNote
                    ? doc.reviewNote
                    : d.hint}
                </Text>

                {doc?.state !== "approved" && (
                  <Pressable
                    onPress={() => attach(d.key)}
                    disabled={busy}
                    className={`mt-3 h-8 rounded-lg items-center justify-center bg-[#2563eb] ${
                      busy ? "opacity-60" : ""
                    }`}
                  >
                    <Text className="text-xs font-semibold text-white">
                      {busy ? "Uploading…" : doc ? "Replace" : "Upload"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* What the status means */}
      <View className="bg-[#eff4ff] rounded-xl p-4 gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name={status.icon} size={18} color={status.color} />
          <Text className="text-[15px] font-semibold text-[#0b1c30]">
            {status.label}
          </Text>
        </View>
        <Text className="text-[13px] text-[#434655]">{status.text}</Text>
        <Text className="text-[12px] text-[#737686] mt-1">
          Your car becomes Verified once all four documents are approved. Only
          you and our reviewers can open them. Buyers never see the files.
        </Text>
      </View>
    </View>
  );
}

/* ---------- buyer view ---------- */

function BuyerEvidence() {
  const router = useRouter();
  return (
    <ScrollView
      className="flex-1 bg-[#f8f9ff]"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <TitleBar
        title="Evidence"
        subtitle="How to read the checks on a listing"
      />

      <View className="px-4 pt-4 gap-5">
        <View>
          <Text className="text-[18px] font-semibold text-[#0b1c30] mb-2">
            What sellers can provide
          </Text>
          <View className="gap-2">
            {DOCS.map((d) => (
              <View
                key={d.key}
                className="bg-white rounded-xl p-3 shadow-sm flex-row gap-3 items-center"
              >
                <View className="w-9 h-9 rounded-full bg-[#e5eeff] items-center justify-center">
                  <MaterialIcons
                    name={d.icon}
                    size={18}
                    color={COLOR.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#0b1c30]">
                    {d.label}
                  </Text>
                  <Text className="text-[12px] text-[#434655]">{d.hint}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-[18px] font-semibold text-[#0b1c30] mb-2">
            What the status means
          </Text>
          <View className="gap-2">
            {Object.entries(STATUS).map(([key, s]) => (
              <View
                key={key}
                className="bg-white rounded-xl p-3 shadow-sm gap-1.5"
              >
                <View className="flex-row">
                  <StatusBadge status={key} />
                </View>
                <Text className="text-[13px] text-[#434655]">{s.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => router.navigate("/explore" as any)}
          className="py-3 rounded-lg bg-[#2563eb] items-center"
        >
          <Text className="text-[14px] font-semibold text-white">
            Browse cars
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ---------- screen ---------- */

export default function Evidence() {
  const { user } = useAuth();
  const isSeller = user?.role === "seller" || user?.role === "admin";
  return isSeller ? <SellerEvidence /> : <BuyerEvidence />;
}
