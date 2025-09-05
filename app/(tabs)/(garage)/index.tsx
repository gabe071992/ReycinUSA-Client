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
import { Plus, Car, Calendar, Wrench } from "lucide-react-native";
import { router } from "expo-router";
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
          <TouchableOpacity style={styles.addButton}>
            <Plus size={20} color={theme.colors.black} />
            <Text style={styles.addButtonText}>ADD VEHICLE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {Object.entries(vehicles).map(([id, vehicle]: [string, any]) => (
            <TouchableOpacity
              key={id}
              style={styles.vehicleCard}
              onPress={() => {}}
            >
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop" }}
                style={styles.vehicleImage}
              />
              <View style={styles.vehicleContent}>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                <Text style={styles.vehicleVin}>VIN: {vehicle.vin}</Text>
                <Text style={styles.vehicleYear}>Year: {vehicle.year}</Text>
                
                <View style={styles.vehicleActions}>
                  <TouchableOpacity style={styles.vehicleAction}>
                    <Wrench size={16} color={theme.colors.white} />
                    <Text style={styles.vehicleActionText}>Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vehicleAction}>
                    <Calendar size={16} color={theme.colors.white} />
                    <Text style={styles.vehicleActionText}>History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => {}}
        >
          <View style={styles.actionIcon}>
            <Calendar size={24} color={theme.colors.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Book Service</Text>
            <Text style={styles.actionDescription}>Schedule maintenance or track support</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Wrench size={24} color={theme.colors.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Maintenance Schedule</Text>
            <Text style={styles.actionDescription}>View recommended service intervals</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  addButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  vehicleCard: {
    backgroundColor: theme.colors.darkGray,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  vehicleImage: {
    width: "100%",
    height: 200,
  },
  vehicleContent: {
    padding: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
  },
  vehicleActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  vehicleAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  vehicleActionText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "500",
  },
  quickActions: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
});