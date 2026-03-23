import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { theme } from "@/constants/theme";
import { Car, Tag, Package } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";

export default function GarageScreen() {
  const { profile } = useAuth();
  const vehicles = profile?.vehicles || {};
  const vehicleList = Object.entries(vehicles);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {vehicleList.length === 0 ? (
        <View style={styles.emptyState}>
          <Car size={64} color={theme.colors.textGray} strokeWidth={1} />
          <Text style={styles.emptyTitle}>No Vehicles Yet</Text>
          <Text style={styles.emptyDescription}>
            Browse the shop, configure your Reycin vehicle, and tap "Add to Garage"
          </Text>
        </View>
      ) : (
        <View style={styles.vehicleList}>
          {vehicleList.map(([id, vehicle]: [string, any]) => (
            <TouchableOpacity
              key={id}
              style={styles.vehicleCard}
              activeOpacity={0.85}
              onPress={() => {}}
            >
              {vehicle.image ? (
                <Image
                  source={{ uri: vehicle.image }}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <Car size={40} color={theme.colors.textGray} strokeWidth={1} />
                </View>
              )}

              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>

                <View style={styles.badgeRow}>
                  {vehicle.color && (
                    <View style={styles.badge}>
                      <Tag size={11} color={theme.colors.textGray} strokeWidth={1.8} />
                      <Text style={styles.badgeText}>{vehicle.color}</Text>
                    </View>
                  )}
                  {vehicle.package && (
                    <View style={styles.badge}>
                      <Package size={11} color={theme.colors.textGray} strokeWidth={1.8} />
                      <Text style={styles.badgeText}>{vehicle.package}</Text>
                    </View>
                  )}
                </View>

                {vehicle.specs && Object.keys(vehicle.specs).length > 0 && (
                  <View style={styles.specsRow}>
                    {vehicle.specs.hp !== undefined && (
                      <View style={styles.specItem}>
                        <Text style={styles.specValue}>{vehicle.specs.hp}</Text>
                        <Text style={styles.specLabel}>hp</Text>
                      </View>
                    )}
                    {vehicle.specs.engine && (
                      <View style={[styles.specItem, styles.specItemGrow]}>
                        <Text style={styles.specValue} numberOfLines={1}>{vehicle.specs.engine}</Text>
                        <Text style={styles.specLabel}>engine</Text>
                      </View>
                    )}
                    {vehicle.specs.weight_lbs !== undefined && (
                      <View style={styles.specItem}>
                        <Text style={styles.specValue}>{vehicle.specs.weight_lbs}</Text>
                        <Text style={styles.specLabel}>lbs</Text>
                      </View>
                    )}
                  </View>
                )}

                {vehicle.vin && (
                  <Text style={styles.vin}>VIN: {vehicle.vin}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 22,
  },
  vehicleList: {
    padding: theme.spacing.lg,
    gap: 16,
  },
  vehicleCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    overflow: "hidden",
  },
  vehicleImage: {
    width: "100%",
    height: 180,
  },
  vehicleImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: theme.colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleInfo: {
    padding: 16,
    gap: 10,
  },
  vehicleModel: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.textGray,
    fontWeight: "500",
  },
  specsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  specItem: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 60,
  },
  specItemGrow: {
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.white,
  },
  specLabel: {
    fontSize: 10,
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  vin: {
    fontSize: 12,
    color: theme.colors.textGray,
    fontFamily: "monospace" as any,
  },
});
