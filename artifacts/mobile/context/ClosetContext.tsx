import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, type AuthUser } from "../utils/api";

export type ClothingCategory = "tops" | "bottoms" | "shoes" | "accessories";

export interface ClothingItem {
  id: string;
  imageUri: string | null;
  imageThumb: string | null;
  category: ClothingCategory;
  color: string;
  colorHex: string;
  tags: string[];
  name: string;
  addedAt: number;
}

export interface SavedLook {
  id: string;
  name: string;
  imageThumb: string | null; // compressed full-outfit photo
  itemNames: string[];
  createdAt: number;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  styleScore: number;
  isComfortZone: boolean;
}

export interface Rating {
  outfitId: string;
  rating: "like" | "dislike";
  ratedAt: number;
}

export interface UserProfile {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  gender: string;
}

interface ClosetContextValue {
  items: ClothingItem[];
  outfits: Outfit[];
  ratings: Rating[];
  savedLooks: SavedLook[];
  profileName: string;
  userProfile: UserProfile | null;
  isOnboarded: boolean;
  addItem: (item: Omit<ClothingItem, "id" | "addedAt">) => void;
  removeItem: (id: string) => void;
  addLook: (look: Omit<SavedLook, "id" | "createdAt">) => void;
  removeLook: (id: string) => void;
  rateOutfit: (outfitId: string, rating: "like" | "dislike") => void;
  generateOutfits: (comfortZone?: boolean) => Outfit[];
  completeOnboarding: (profile: Omit<UserProfile, "id"> & { password: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<"ok" | "wrong_password" | "not_found">;
  setProfileName: (name: string) => void;
  signOut: () => void;
}

const ClosetContext = createContext<ClosetContextValue | null>(null);

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const SAMPLE_ITEMS: ClothingItem[] = [
  {
    id: "s1",
    imageUri: null,
    imageThumb: null,
    category: "tops",
    color: "Cream",
    colorHex: "#F5F0E8",
    tags: ["casual", "basic"],
    name: "Linen Shirt",
    addedAt: Date.now() - 7 * 86400000,
  },
  {
    id: "s2",
    imageUri: null,
    imageThumb: null,
    category: "tops",
    color: "Charcoal",
    colorHex: "#2D2926",
    tags: ["smart", "classic"],
    name: "Charcoal Turtleneck",
    addedAt: Date.now() - 6 * 86400000,
  },
  {
    id: "s3",
    imageUri: null,
    imageThumb: null,
    category: "tops",
    color: "Navy",
    colorHex: "#1E3A5F",
    tags: ["smart", "versatile"],
    name: "Navy Blazer",
    addedAt: Date.now() - 5 * 86400000,
  },
  {
    id: "s4",
    imageUri: null,
    imageThumb: null,
    category: "bottoms",
    color: "Indigo",
    colorHex: "#3730A3",
    tags: ["casual", "denim"],
    name: "Slim Jeans",
    addedAt: Date.now() - 5 * 86400000,
  },
  {
    id: "s5",
    imageUri: null,
    imageThumb: null,
    category: "bottoms",
    color: "Camel",
    colorHex: "#C4956A",
    tags: ["smart", "neutral"],
    name: "Camel Trousers",
    addedAt: Date.now() - 4 * 86400000,
  },
  {
    id: "s6",
    imageUri: null,
    imageThumb: null,
    category: "shoes",
    color: "White",
    colorHex: "#F0EFEB",
    tags: ["casual", "sneaker"],
    name: "White Sneakers",
    addedAt: Date.now() - 3 * 86400000,
  },
  {
    id: "s7",
    imageUri: null,
    imageThumb: null,
    category: "shoes",
    color: "Tan",
    colorHex: "#B8956A",
    tags: ["leather", "smart"],
    name: "Tan Loafers",
    addedAt: Date.now() - 2 * 86400000,
  },
  {
    id: "s8",
    imageUri: null,
    imageThumb: null,
    category: "accessories",
    color: "Tan",
    colorHex: "#C4956A",
    tags: ["leather", "classic"],
    name: "Leather Belt",
    addedAt: Date.now() - 2 * 86400000,
  },
];

function colorHarmony(h1: string, h2: string): number {
  const neutrals = [
    "#F5F0E8", "#F0EFEB", "#2D2926", "#1C1917", "#FFFFFF", "#C4956A", "#B8956A",
  ];
  if (neutrals.includes(h1) || neutrals.includes(h2)) return 0.88;
  if (h1 === h2) return 0.65;
  return 0.72;
}

function buildOutfits(items: ClothingItem[], comfortZone: boolean): Outfit[] {
  const tops = items.filter((i) => i.category === "tops");
  const bottoms = items.filter((i) => i.category === "bottoms");
  const shoes = items.filter((i) => i.category === "shoes");
  const accessories = items.filter((i) => i.category === "accessories");

  if (!tops.length || !bottoms.length) return [];

  const results: Outfit[] = [];

  tops.forEach((top) => {
    bottoms.forEach((bottom) => {
      const score = colorHarmony(top.colorHex, bottom.colorHex);
      const shoe = shoes[Math.floor(Math.random() * Math.max(1, shoes.length))];
      const acc = accessories[Math.floor(Math.random() * Math.max(1, accessories.length))];
      const itemIds = [top.id, bottom.id];
      if (shoe) itemIds.push(shoe.id);
      if (acc) itemIds.push(acc.id);

      const styleScore = comfortZone
        ? Math.round((Math.random() * 0.25 + 0.55) * 100) / 100
        : Math.round(score * 100) / 100;

      results.push({ id: makeId(), itemIds, styleScore, isComfortZone: comfortZone });
    });
  });

  return results.sort(() => Math.random() - 0.5).slice(0, comfortZone ? 6 : 10);
}

function userFromAuth(u: AuthUser): UserProfile {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    age: u.age,
    gender: u.gender,
  };
}

export function ClosetProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [profileName, setProfileNameState] = useState("");
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [itemsStr, ratingsStr, tokenStr, looksStr] = await Promise.all([
          AsyncStorage.getItem("@cf_items"),
          AsyncStorage.getItem("@cf_ratings"),
          AsyncStorage.getItem("@cf_token"),
          AsyncStorage.getItem("@cf_looks"),
        ]);

        const loadedItems = itemsStr ? JSON.parse(itemsStr) : SAMPLE_ITEMS;
        if (!itemsStr) {
          await AsyncStorage.setItem("@cf_items", JSON.stringify(SAMPLE_ITEMS));
        }
        setItems(loadedItems);
        if (ratingsStr) setRatings(JSON.parse(ratingsStr));
        if (looksStr) setSavedLooks(JSON.parse(looksStr));
        setOutfits(buildOutfits(loadedItems, false));

        if (tokenStr) {
          try {
            const { user } = await api.me(tokenStr);
            const profile = userFromAuth(user);
            setUserProfileState(profile);
            setProfileNameState(`${profile.firstName} ${profile.lastName}`.trim() || profile.firstName);
            setIsOnboarded(true);
          } catch {
            await AsyncStorage.removeItem("@cf_token");
          }
        }
      } catch {
        setItems(SAMPLE_ITEMS);
        setOutfits(buildOutfits(SAMPLE_ITEMS, false));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const addItem = useCallback((data: Omit<ClothingItem, "id" | "addedAt">) => {
    const item: ClothingItem = { ...data, id: makeId(), addedAt: Date.now() };
    setItems((prev) => {
      const next = [item, ...prev];
      AsyncStorage.setItem("@cf_items", JSON.stringify(next));
      setOutfits(buildOutfits(next, false));
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      AsyncStorage.setItem("@cf_items", JSON.stringify(next));
      return next;
    });
  }, []);

  const addLook = useCallback((data: Omit<SavedLook, "id" | "createdAt">) => {
    const look: SavedLook = { ...data, id: makeId(), createdAt: Date.now() };
    setSavedLooks((prev) => {
      const next = [look, ...prev];
      AsyncStorage.setItem("@cf_looks", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeLook = useCallback((id: string) => {
    setSavedLooks((prev) => {
      const next = prev.filter((l) => l.id !== id);
      AsyncStorage.setItem("@cf_looks", JSON.stringify(next));
      return next;
    });
  }, []);

  const rateOutfit = useCallback((outfitId: string, rating: "like" | "dislike") => {
    const newRating: Rating = { outfitId, rating, ratedAt: Date.now() };
    setRatings((prev) => {
      const next = [newRating, ...prev.filter((r) => r.outfitId !== outfitId)];
      AsyncStorage.setItem("@cf_ratings", JSON.stringify(next));
      return next;
    });
  }, []);

  const generateOutfits = useCallback(
    (comfortZone = false): Outfit[] => {
      const generated = buildOutfits(items, comfortZone);
      setOutfits(generated);
      return generated;
    },
    [items]
  );

  const completeOnboarding = useCallback(
    async (profile: Omit<UserProfile, "id"> & { password: string }) => {
      const { token, user } = await api.register({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        password: profile.password,
        age: profile.age,
        gender: profile.gender,
      });
      await AsyncStorage.setItem("@cf_token", token);
      const up = userFromAuth(user);
      const fullName = `${up.firstName} ${up.lastName}`.trim() || up.firstName || "Stylist";
      setIsOnboarded(true);
      setProfileNameState(fullName);
      setUserProfileState(up);
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<"ok" | "wrong_password" | "not_found"> => {
      try {
        const { token, user } = await api.login(email, password);
        await AsyncStorage.setItem("@cf_token", token);
        const up = userFromAuth(user);
        const fullName = `${up.firstName} ${up.lastName}`.trim() || up.firstName || "Stylist";
        setIsOnboarded(true);
        setProfileNameState(fullName);
        setUserProfileState(up);
        return "ok";
      } catch (err: any) {
        if (err?.error === "wrong_password") return "wrong_password";
        if (err?.error === "not_found" || err?.status === 404) return "not_found";
        return "not_found";
      }
    },
    []
  );

  const setProfileName = useCallback((name: string) => {
    setProfileNameState(name);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(["@cf_token"]);
    setIsOnboarded(false);
    setProfileNameState("");
    setUserProfileState(null);
  }, []);

  if (!loaded) return null;

  return (
    <ClosetContext.Provider
      value={{
        items,
        outfits,
        ratings,
        savedLooks,
        profileName,
        userProfile,
        isOnboarded,
        addItem,
        removeItem,
        addLook,
        removeLook,
        rateOutfit,
        generateOutfits,
        completeOnboarding,
        signIn,
        setProfileName,
        signOut,
      }}
    >
      {children}
    </ClosetContext.Provider>
  );
}

export function useCloset() {
  const ctx = useContext(ClosetContext);
  if (!ctx) throw new Error("useCloset must be inside ClosetProvider");
  return ctx;
}
