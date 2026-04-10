import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Play } from "lucide-react-native";
import type { MediaItem } from "@/types/league";

interface VideoThumbnailCardProps {
  item: MediaItem;
}

export default function VideoThumbnailCard({ item }: VideoThumbnailCardProps) {
  const handlePlay = async () => {
    try {
      console.log("[VideoThumbnailCard] Opening video:", item.url);
      await Linking.openURL(item.url);
    } catch (err) {
      console.error("[VideoThumbnailCard] Failed to open URL:", err);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePlay}
      activeOpacity={0.8}
      testID={`video-card-${item.id}`}
    >
      <View style={styles.thumbnailWrap}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbnailFallback} />
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Play size={14} color="#FFF" fill="#FFF" strokeWidth={0} />
          </View>
        </View>
        <View style={styles.durationBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.durationText}>VIDEO</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#080808",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#111",
  },
  thumbnailWrap: {
    position: "relative",
    aspectRatio: 16 / 9,
    backgroundColor: "#0d0d0d",
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,24,1,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  durationBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF1801",
  },
  durationText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 1,
  },
  meta: {
    padding: 10,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#444",
    letterSpacing: 0.3,
  },
});
