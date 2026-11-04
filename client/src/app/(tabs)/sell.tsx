import { useState, type ComponentProps } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { OptionPicker } from "@/components/ui/OptionPicker";
import {
  BODY_TYPES,
  FUEL_TYPES,
  type BodyTypeKey,
  type FuelTypeKey,
} from "@/constants/vehicle";
import { pickDocument, uploadEvidence, type PickedDoc } from "@/lib/evidence";

type IconName = ComponentProps<typeof Ionicons>["name"];

const MAX_PHOTOS = 8;
const EVIDENCE: { key: string; label: string; icon: IconName }[] = [
  {
    key: "registration",
    label: "Registration book",
    icon: "document-text-outline",
  },
  { key: "inspection", label: "Inspection report", icon: "clipboard-outline" },
  { key: "service", label: "Service history", icon: "construct-outline" },
  { key: "owner_cnic", label: "Owner ID match", icon: "id-card-outline" },
];

const digits = (s: string) => s.replace(/\D/g, "");

function priceLabel(raw: string) {
  const n = Number(raw);
  if (!n) return "";
  if (n >= 1_000_000) {
    return `PKR ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-1 font-sans-bold text-[11px] uppercase tracking-[0.8px] text-muted">
      {children}
    </Text>
  );
}

export default function SellScreen() {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [price, setPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, PickedDoc>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bodyType, setBodyType] = useState<BodyTypeKey | null>(null);
  const [fuelType, setFuelType] = useState<FuelTypeKey | null>(null);

  async function pickPhotos() {
    const left = MAX_PHOTOS - photos.length;
    if (left <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: left,
      quality: 0.8,
    });
    if (!res.canceled) {
      setPhotos((p) =>
        [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS),
      );
    }
  }

  function reset() {
    setYear("");
    setMakeModel("");
    setPrice("");
    setMileage("");
    setCity("");
    setAbout("");
    setPhotos([]);
    setEvidence([]);
    setBodyType(null);
    setFuelType(null);
    setError(null);
  }

  async function attachDoc(key: string) {
    const picked = await pickDocument();
    if (picked) setDocs((d) => ({ ...d, [key]: picked }));
  }

  function removeDoc(key: string) {
    setDocs((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  function validate(): string | null {
    const y = Number(year);
    if (!y || y < 1990 || y > new Date().getFullYear() + 1)
      return "Enter a valid model year, like 2018.";
    if (makeModel.trim().length < 3) return "Enter the make and model.";
    if (!Number(price)) return "Enter the asking price in rupees.";
    if (!Number(mileage)) return "Enter the mileage in km.";
    if (city.trim().length < 2) return "Enter the city.";
    if (photos.length < 1) return "Add at least one photo.";
    return null;
  }

  const mimeOf = (uri: string) =>
    /\.png$/i.test(uri)
      ? "image/png"
      : /\.webp$/i.test(uri)
        ? "image/webp"
        : "image/jpeg";

  async function submit() {
    if (busy) return;

    const problem = validate();
    setError(problem);
    if (problem) return;

    if (!bodyType) return setError("Please select a body type.");
    if (!fuelType) return setError("Please select a fuel type.");

    setBusy(true);

    try {
      const form = new FormData();

      form.append("year", year);
      form.append("makeModel", makeModel.trim());
      form.append("price", price);
      form.append("mileage", mileage);
      form.append("city", city.trim());
      form.append("about", about.trim());
      form.append("bodyType", bodyType);
      form.append("fuelType", fuelType);

      photos.forEach((uri, i) =>
        form.append("photos", {
          uri,
          name: `photo${i}.jpg`,
          type: mimeOf(uri),
        } as unknown as Blob),
      );

      const { listing } = await api<{ listing: { id: string } }>(
        "/api/listings",
        {
          method: "POST",
          body: form,
        },
      );

      const failed: string[] = [];
      for (const e of EVIDENCE) {
        const doc = docs[e.key];
        if (!doc) continue;
        try {
          await uploadEvidence(listing.id, e.key, doc);
        } catch {
          failed.push(e.label);
        }
      }

      const attached = Object.keys(docs).length;

      Alert.alert(
        "Listing posted",
        failed.length
          ? `Your car is listed, but these didn't upload: ${failed.join(", ")}. Add them again from the Evidence tab.`
          : attached
            ? "Your documents are now under review."
            : "It shows as 'Not yet checked'. Add documents from the Evidence tab to get it reviewed.",
        [
          {
            text: "OK",
            onPress: () => {
              reset();
              router.replace("/");
            },
          },
        ],
      );
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-5 p-4 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="font-sans-bold text-2xl tracking-[-0.45px] text-ink">
            Sell your car
          </Text>
          <Text className="mt-1 text-sm text-muted">
            Listings with checked evidence get more trust from buyers.
          </Text>
        </View>

        {/* Photos */}
        <View className="gap-2">
          <SectionTitle>Photos</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
          >
            <Pressable
              onPress={pickPhotos}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              className="h-28 w-28 items-center justify-center gap-1 rounded-2xl border border-dashed border-primary/40 bg-tint-50 active:opacity-70"
            >
              <Ionicons name="camera-outline" size={26} color="#2563eb" />
              <Text className="font-sans-semibold text-xs text-primary">
                {photos.length}/{MAX_PHOTOS}
              </Text>
            </Pressable>
            {photos.map((uri) => (
              <View key={uri} className="h-28 w-28">
                <Image
                  source={{ uri }}
                  className="h-28 w-28 rounded-2xl bg-tint-100"
                />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((u) => u !== uri))}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-ink/70"
                >
                  <Ionicons name="close" size={16} color="#ffffff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Details */}
        <View className="gap-4">
          <SectionTitle>Car details</SectionTitle>
          <View className="flex-row gap-3">
            <View className="w-28">
              <TextField
                label="Year"
                value={year}
                onChangeText={(v) => setYear(digits(v).slice(0, 4))}
                keyboardType="number-pad"
                placeholder="2018"
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Make and model"
                value={makeModel}
                onChangeText={setMakeModel}
                placeholder="Toyota Corolla GLi"
                autoCapitalize="words"
              />
            </View>
          </View>
          <TextField
            label="Asking price (PKR)"
            value={price}
            onChangeText={(v) => setPrice(digits(v))}
            keyboardType="number-pad"
            placeholder="4850000"
          />
          {price ? (
            <Text className="-mt-2 px-1 text-xs text-muted">
              Buyers will see: {priceLabel(price)}
            </Text>
          ) : null}
          <TextField
            label="Mileage (km)"
            value={mileage}
            onChangeText={(v) => setMileage(digits(v))}
            keyboardType="number-pad"
            placeholder="62000"
          />
          <TextField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Lahore"
            autoCapitalize="words"
          />
          <TextField
            label="About the car (optional)"
            value={about}
            onChangeText={setAbout}
            multiline
            placeholder="Owners, accident history, recent work…"
          />
          <OptionPicker
            label="Body type"
            options={BODY_TYPES}
            value={bodyType}
            onChange={setBodyType}
          />
          <OptionPicker
            label="Fuel type"
            options={FUEL_TYPES}
            value={fuelType}
            onChange={setFuelType}
          />
        </View>

        {/* Evidence */}
        {/* Evidence */}
        <View className="gap-2">
          <SectionTitle>Evidence documents</SectionTitle>
          <Text className="px-1 text-sm text-muted">
            Attach a photo or PDF of each document you have. They're reviewed
            before your listing shows as verified. Only you and our reviewers
            can see them.
          </Text>
          {EVIDENCE.map((e) => {
            const doc = docs[e.key];
            return (
              <View
                key={e.key}
                className="flex-row items-center gap-3 rounded-xl border border-tint-200 bg-white p-3"
              >
                <Ionicons
                  name={doc ? "checkmark-circle" : e.icon}
                  size={22}
                  color={doc ? "#006242" : "#434655"}
                />
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-ink">
                    {e.label}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-muted">
                    {doc ? doc.name : "Optional"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => (doc ? removeDoc(e.key) : attachDoc(e.key))}
                  accessibilityRole="button"
                  className="h-9 items-center justify-center rounded-full border border-tint-200 px-3.5"
                >
                  <Text className="font-sans-semibold text-xs text-primary">
                    {doc ? "Remove" : "Attach"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-danger"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          className={`h-12 items-center justify-center rounded-xl bg-primary active:opacity-80 ${
            busy ? "opacity-60" : ""
          }`}
        >
          <Text className="font-sans-bold text-base text-white">
            {busy ? "Submitting…" : "Submit for checking"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
