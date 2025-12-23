import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { theme } from "@/constants/theme";
import { Car } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";

export default function GarageScreen() {
  const { profile } = useAuth();
  const vehicles = profile?.vehicles || {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {Object.keys(vehicles).length === 0 ? (
        <View style={styles.emptyState}>
          <Car size={64} color={theme.colors.textGray} strokeWidth={1} />
          <Text style={styles.emptyTitle}>No Vehicles Yet</Text>
          <Text style={styles.emptyDescription}>
            Add your Reycin vehicle to access diagnostics, service history, and more
          </Text>
        </View>
      ) : (
        <View style={styles.vehicleList}>
          {Object.entries(vehicles).map(([id, vehicle]: [string, any]) => (
            <TouchableOpacity
              key={id}
              style={styles.vehicleCard}
              onPress={() => {}}
            >
              <Text style={styles.vehicleModel}>{vehicle.model}</Text>
              <Text style={styles.vehicleVin}>VIN: {vehicle.vin}</Text>
              <Text style={styles.vehicleYear}>Year: {vehicle.year}</Text>
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
    flex: 1,
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
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  vehicleList: {
    padding: theme.spacing.lg,
  },
  vehicleCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  vehicleModel: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 8,
  },
  vehicleVin: {
    fontSize: 14,
    color: theme.colors.textGray,
    marginBottom: 4,
  },
  vehicleYear: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
});
