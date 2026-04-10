import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { ArrowLeft, Tv2 } from "lucide-react-native";
import VideoThumbnailCard from "@/components/league/VideoThumbnailCard";
import { useLeague } from "@/providers/LeagueProvider";

interface WatchScreenProps {
  leagueId: string;
  onBack: () => void;
}

export default function WatchScreen({ leagueId, onBack }: WatchScreenProps) {
  const { media } = useLeague();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const videos = useMemo(
    () =>
      media
        .filter((m) => m.type === "video" && m.leagueId === leagueId)
        .sort((a, b) => b.uploadedAt - a.uploadedAt),
    [media, leagueId]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const v of videos) {
      for (const t of v.tags) set.add(t);
    }
    return Array.from(set);
  }, [videos]);

  const filtered = useMemo(
    () =>
      activeTag ? videos.filter((v) => v.tags.includes(activeTag)) : videos,
    [videos, activeTag]
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        numColumns={1}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backRow}
                onPress={onBack}
                activeOpacity={0.7}
                testID="watch-back-btn"
              >
                <ArrowLeft size={14} color="#555" strokeWidth={2} />
                <Text style={styles.backText}>BACK</Text>
              </TouchableOpacity>

              <View style={styles.titleRow}>
                <View style={styles.titleIconWrap}>
                  <Tv2 size={14} color="#FF1801" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.screenTitle}>WATCH</Text>
                  <Text style={styles.screenSub}>
                    {videos.length} video{videos.length !== 1 ? "s" : ""}{" "}
                    available
                  </Text>
                </View>
              </View>
            </View>

            {allTags.length > 0 && (
              <View style={styles.tagFilterWrap}>
                <TouchableOpacity
                  style={[
                    styles.tagChip,
                    activeTag === null && styles.tagChipActive,
                  ]}
                  onPress={() => setActiveTag(null)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      activeTag === null && styles.tagChipTextActive,
                    ]}
                  >
                    ALL
                  </Text>
                </TouchableOpacity>
                {allTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      activeTag === tag && styles.tagChipActive,
                    ]}
                    onPress={() =>
                      setActiveTag((prev) => (prev === tag ? null : tag))
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        activeTag === tag && styles.tagChipTextActive,
                      ]}
                    >
                      {tag.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.videoWrap}>
            <VideoThumbnailCard item={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Tv2 size={40} color="#1a1a1a" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Videos Yet</Text>
            <Text style={styles.emptySub}>
              Race recaps and highlights will appear here once they are
              uploaded.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingBottom: 20 },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  backText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "rgba(255,24,1,0.08)",
    borderWidth: 1,
    borderColor: "#2a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },
  screenSub: {
    fontSize: 11,
    color: "#444",
    marginTop: 2,
  },
  tagFilterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  tagChip: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagChipActive: {
    backgroundColor: "rgba(255,24,1,0.08)",
    borderColor: "#FF1801",
  },
  tagChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1.5,
  },
  tagChipTextActive: {
    color: "#FF1801",
  },
  videoWrap: {
    marginHorizontal: 14,
    marginTop: 14,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#2a2a2a",
    textAlign: "center",
    lineHeight: 18,
  },
});
