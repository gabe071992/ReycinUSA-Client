import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, Flag, ShoppingBag, Gauge, ChevronRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { ref, get } from "firebase/database";
import { database } from "@/config/firebase";
import { useRouter } from "expo-router";
import { tick } from "@/utils/tick";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_H = 330;
const DIAL_SIZE = Math.floor((SCREEN_W - 48 - 12) / 2);

const W = {
  GOLD: "#C9A84C",
  GOLD_DIM: "rgba(201,168,76,0.25)",
  GOLD_SOFT: "rgba(201,168,76,0.12)",
  CHAMPAGNE: "#E8D5A0",
  DEEP_BLACK: "#0A0A0A",
  PLATE: "#111111",
  PLATE_BORDER: "rgba(201,168,76,0.18)",
  WHITE: "#FFFFFF",
  TEXT_DIM: "#777777",
};

function useGearAnim(duration: number, reverse = false) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, [anim, duration]);
  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ["360deg", "0deg"] : ["0deg", "360deg"],
  });
  return rotate;
}

function GearRingLayer() {
  const rot1 = useGearAnim(28000);
  const rot2 = useGearAnim(19000, true);
  const rot3 = useGearAnim(13000);

  const S = SCREEN_W;
  const CX = S / 2;
  const CY = S / 2;
  const top = (HERO_H - S) / 2;

  return (
    <View
      style={{
        position: "absolute",
        width: S,
        height: S,
        top,
        left: 0,
      }}
      pointerEvents="none"
    >
      <Svg width={S} height={S} style={StyleSheet.absoluteFillObject}>
        <Circle cx={CX} cy={CY} r={170} stroke={W.GOLD} strokeWidth={0.5} fill="none" opacity={0.1} />
        <Circle cx={CX} cy={CY} r={126} stroke={W.GOLD} strokeWidth={0.5} fill="none" opacity={0.08} />
        <Circle cx={CX} cy={CY} r={80} stroke={W.GOLD} strokeWidth={0.5} fill="none" opacity={0.07} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: rot1 }] }]}>
        <Svg width={S} height={S}>
          <Circle cx={CX} cy={CY} r={158} stroke={W.GOLD} strokeWidth={2.5} strokeDasharray="13 9" fill="none" opacity={0.38} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: rot2 }] }]}>
        <Svg width={S} height={S}>
          <Circle cx={CX} cy={CY} r={113} stroke={W.GOLD} strokeWidth={1.8} strokeDasharray="9 7" fill="none" opacity={0.27} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: rot3 }] }]}>
        <Svg width={S} height={S}>
          <Circle cx={CX} cy={CY} r={70} stroke={W.GOLD} strokeWidth={1.2} strokeDasharray="6 5.5" fill="none" opacity={0.22} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.text}>{title}</Text>
      <View style={shStyles.rule} />
      {action && <View style={{ marginLeft: 10 }}>{action}</View>}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
    color: W.GOLD,
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  rule: {
    flex: 1,
    height: 0.5,
    backgroundColor: W.GOLD,
    opacity: 0.3,
    marginLeft: 12,
  },
});

interface DialProps {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  title: string;
  description: string;
  onPress: () => void;
}

function ComplicationDial({ Icon, title, description, onPress }: DialProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    tick();
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.89,
        useNativeDriver: true,
        damping: 18,
        stiffness: 380,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 200,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const R = DIAL_SIZE / 2 - 5;
  const tickMarks = Array.from({ length: 12 }, (_, i) => {
    const angleRad = (i * 30 * Math.PI) / 180;
    const isMajor = i % 3 === 0;
    const tickLen = isMajor ? 11 : 6;
    const x1 = DIAL_SIZE / 2 + (R - tickLen) * Math.sin(angleRad);
    const y1 = DIAL_SIZE / 2 - (R - tickLen) * Math.cos(angleRad);
    const x2 = DIAL_SIZE / 2 + R * Math.sin(angleRad);
    const y2 = DIAL_SIZE / 2 - R * Math.cos(angleRad);
    return { x1, y1, x2, y2, isMajor };
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [W.GOLD_DIM, "rgba(201,168,76,0.7)"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            dialStyles.container,
            { borderColor },
          ]}
        >
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} style={StyleSheet.absoluteFillObject}>
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={DIAL_SIZE / 2 - 18}
              stroke={W.GOLD}
              strokeWidth={0.5}
              fill="none"
              opacity={0.18}
            />
            {tickMarks.map((mark, i) => (
              <Line
                key={i}
                x1={mark.x1}
                y1={mark.y1}
                x2={mark.x2}
                y2={mark.y2}
                stroke={W.GOLD}
                strokeWidth={mark.isMajor ? 1.5 : 0.75}
                opacity={mark.isMajor ? 0.65 : 0.28}
              />
            ))}
          </Svg>
          <Icon size={26} color={W.GOLD} strokeWidth={1.5} />
          <Text style={dialStyles.title}>{title}</Text>
          <Text style={dialStyles.description}>{description}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const dialStyles = StyleSheet.create({
  container: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: W.PLATE,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: W.WHITE,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.8,
    marginTop: 7,
    textTransform: "uppercase",
  },
  description: {
    color: W.CHAMPAGNE,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 3,
    opacity: 0.65,
  },
});

function LoadingDial() {
  const rot = useGearAnim(3000);
  const S = 80;
  const CX = S / 2;
  const CY = S / 2;
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 200 }}>
      <Animated.View style={{ transform: [{ rotate: rot }] }}>
        <Svg width={S} height={S}>
          <Circle cx={CX} cy={CY} r={34} stroke={W.GOLD} strokeWidth={2} strokeDasharray="8 6" fill="none" opacity={0.6} />
        </Svg>
      </Animated.View>
      <Text style={{ color: W.GOLD, fontSize: 9, letterSpacing: 3, marginTop: 14, opacity: 0.6 }}>LOADING</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const heroFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(18)).current;

  const [timeStr, setTimeStr] = useState(() => {
    const n = new Date();
    const h = n.getHours().toString().padStart(2, "0");
    const m = n.getMinutes().toString().padStart(2, "0");
    const s = n.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  });

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date();
      const h = n.getHours().toString().padStart(2, "0");
      const m = n.getMinutes().toString().padStart(2, "0");
      const s = n.getSeconds().toString().padStart(2, "0");
      setTimeStr(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]),
    ]).start();
  }, [heroFade, contentFade, contentSlide]);

  const { data: announcements, isLoading: annoLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      console.log("[Home] fetching announcements");
      const snapshot = await get(ref(database, "reycinUSA/announcements"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.entries(data)
          .map(([id, item]: [string, any]) => ({ id, ...item }))
          .filter((item) => item.visible)
          .sort((a: any, b: any) => b.createdAt - a.createdAt)
          .slice(0, 5);
      }
      return [];
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      console.log("[Home] fetching products");
      const snapshot = await get(ref(database, "reycinUSA/catalog/products"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.entries(data)
          .map(([id, item]: [string, any]) => ({ id, ...item }))
          .filter((item: any) => item.category === "vehicles" && item.active)
          .slice(0, 4);
      }
      return [];
    },
  });

  const go = useCallback(
    (path: any) => {
      tick();
      router.push(path);
    },
    [router]
  );

  const isLoading = annoLoading || productsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <Animated.View style={[styles.hero, { opacity: heroFade }]}>
          <GearRingLayer />
          <LinearGradient
            colors={[W.DEEP_BLACK, "rgba(10,10,10,0.55)", W.DEEP_BLACK]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.heroBrand}>
            <Text style={styles.heroPre}>REYCIN  USA</Text>
            <Text style={styles.heroWordmark}>REYCIN</Text>
            <View style={styles.heroRuleRow}>
              <View style={styles.heroRuleDot} />
              <View style={styles.heroRuleLine} />
              <View style={styles.heroRuleDot} />
            </View>
            <Text style={styles.heroSeries}>F300  SERIES</Text>
            <Text style={styles.heroTime}>{timeStr}</Text>
          </View>
        </Animated.View>

        {/* ── BODY ── */}
        <Animated.View
          style={{
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          }}
        >
          {isLoading ? (
            <LoadingDial />
          ) : (
            <>
              {/* ANNOUNCEMENTS */}
              {announcements && announcements.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="Latest News" />
                  {announcements.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.newsCard}
                      onPress={() => tick()}
                      activeOpacity={0.75}
                    >
                      <View style={styles.newsBar} />
                      <View style={styles.newsBody}>
                        <View style={styles.newsMeta}>
                          <Text style={styles.newsTag}>{(item.tag ?? "").toUpperCase()}</Text>
                          <View style={styles.newsDivider} />
                          <Text style={styles.newsDate}>
                            {new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                        <Text style={styles.newsTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={W.GOLD_DIM} strokeWidth={1.5} style={{ marginRight: 14 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* VEHICLES */}
              {products && products.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader
                    title="Our Vehicles"
                    action={
                      <TouchableOpacity
                        onPress={() => go("/(tabs)/shop")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.viewAll}>VIEW ALL</Text>
                      </TouchableOpacity>
                    }
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.vehicleRow}
                  >
                    {products.map((product: any) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.vehicleCard}
                        onPress={() => {
                          tick();
                          router.push({
                            pathname: "/(tabs)/shop/product/[id]",
                            params: { id: product.id },
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{
                            uri:
                              product.media?.[0] ||
                              "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop",
                          }}
                          style={styles.vehicleImg}
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(10,10,10,0.92)"]}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View style={styles.vehicleGold} />
                        <View style={styles.vehicleInfo}>
                          <Text style={styles.vehicleName}>{product.name}</Text>
                          {!!product.subtitle && (
                            <Text style={styles.vehicleSub}>{product.subtitle}</Text>
                          )}
                          <Text style={styles.vehiclePrice}>
                            {product.price === 0
                              ? "CONTACT FOR PRICING"
                              : `$${product.price.toLocaleString()}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* COMPLICATIONS GRID */}
              <View style={styles.section}>
                <SectionHeader title="Quick Access" />
                <View style={styles.dialGrid}>
                  <ComplicationDial
                    Icon={Play}
                    title="Watch"
                    description="Leagues Library"
                    onPress={() =>
                      go({ pathname: "/(tabs)/race", params: { initialTab: "league" } })
                    }
                  />
                  <ComplicationDial
                    Icon={Flag}
                    title="Track"
                    description="Book Service"
                    onPress={() => go("/(tabs)/garage")}
                  />
                  <ComplicationDial
                    Icon={ShoppingBag}
                    title="Parts"
                    description="Shop Now"
                    onPress={() =>
                      go({
                        pathname: "/(tabs)/shop/category/[id]",
                        params: { id: "parts" },
                      })
                    }
                  />
                  <ComplicationDial
                    Icon={Gauge}
                    title="Race"
                    description="Open Dashboard"
                    onPress={() => go("/(tabs)/race")}
                  />
                </View>
              </View>

              <View style={{ height: 32 }} />
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: W.DEEP_BLACK,
  },
  scroll: {
    flex: 1,
  },

  /* Hero */
  hero: {
    height: HERO_H,
    backgroundColor: W.DEEP_BLACK,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBrand: {
    alignItems: "center",
    zIndex: 2,
  },
  heroPre: {
    fontSize: 9,
    fontWeight: "400",
    color: W.CHAMPAGNE,
    letterSpacing: 7,
    opacity: 0.65,
    marginBottom: 9,
  },
  heroWordmark: {
    fontSize: 58,
    fontWeight: "100",
    color: W.WHITE,
    letterSpacing: 18,
    marginRight: -18,
    marginBottom: 14,
  },
  heroRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },
  heroRuleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: W.GOLD,
    opacity: 0.85,
  },
  heroRuleLine: {
    width: 56,
    height: 0.5,
    backgroundColor: W.GOLD,
    opacity: 0.55,
    marginHorizontal: 7,
  },
  heroBrandSeries: {
    fontSize: 10,
    fontWeight: "300",
    color: W.GOLD,
    letterSpacing: 5,
    marginBottom: 18,
  },
  heroSeries: {
    fontSize: 10,
    fontWeight: "300",
    color: W.GOLD,
    letterSpacing: 5,
    marginBottom: 18,
  },
  heroTime: {
    fontSize: 30,
    fontWeight: "200",
    color: W.GOLD,
    letterSpacing: 5,
  },

  /* Body sections */
  section: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },

  /* News */
  newsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: W.PLATE,
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: W.PLATE_BORDER,
  },
  newsBar: {
    width: 2.5,
    alignSelf: "stretch",
    backgroundColor: W.GOLD,
    opacity: 0.9,
  },
  newsBody: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  newsMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  newsTag: {
    fontSize: 9,
    fontWeight: "700",
    color: W.GOLD,
    letterSpacing: 2,
  },
  newsDivider: {
    width: 1,
    height: 10,
    backgroundColor: W.GOLD_DIM,
    marginHorizontal: 8,
  },
  newsDate: {
    fontSize: 9,
    color: W.TEXT_DIM,
    letterSpacing: 0.3,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: W.WHITE,
    letterSpacing: 0.2,
    lineHeight: 20,
  },

  /* Vehicles */
  viewAll: {
    fontSize: 9,
    fontWeight: "600",
    color: W.GOLD,
    letterSpacing: 2,
  },
  vehicleRow: {
    paddingRight: 8,
  },
  vehicleCard: {
    width: SCREEN_W * 0.62,
    height: 195,
    marginRight: 11,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: W.PLATE,
    borderWidth: 0.5,
    borderColor: W.PLATE_BORDER,
  },
  vehicleImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  vehicleGold: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: W.GOLD,
    opacity: 0.65,
  },
  vehicleInfo: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "400",
    color: W.WHITE,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  vehicleSub: {
    fontSize: 11,
    color: W.CHAMPAGNE,
    letterSpacing: 0.4,
    opacity: 0.75,
    marginBottom: 6,
  },
  vehiclePrice: {
    fontSize: 9,
    fontWeight: "700",
    color: W.GOLD,
    letterSpacing: 2,
  },

  /* Complication dials grid */
  dialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
