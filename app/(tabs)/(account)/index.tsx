import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { theme } from "@/constants/theme";
import { 
  User, 
  Package, 
  MapPin, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Mail,
  Award
} from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function AccountScreen() {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { 
      icon: Package, 
      title: "Orders", 
      subtitle: "View order history",
      onPress: () => {}
    },
    { 
      icon: MapPin, 
      title: "Addresses", 
      subtitle: "Manage delivery addresses",
      onPress: () => {}
    },
    { 
      icon: Shield, 
      title: "Warranties", 
      subtitle: "Active warranty plans",
      onPress: () => {}
    },
    { 
      icon: Settings, 
      title: "Settings", 
      subtitle: "App preferences",
      onPress: () => {}
    },
    { 
      icon: HelpCircle, 
      title: "Support", 
      subtitle: "Get help",
      onPress: () => {}
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <User size={40} color={theme.colors.white} strokeWidth={1.5} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.displayName || "Driver"}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <View style={styles.roleBadge}>
            <Award size={12} color={theme.colors.black} />
            <Text style={styles.roleText}>{profile?.role?.toUpperCase() || "USER"}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Object.keys(profile?.vehicles || {}).length}
          </Text>
          <Text style={styles.statLabel}>Vehicles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Icon size={20} color={theme.colors.white} strokeWidth={1.5} />
                </View>
                <View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textGray} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sign Out */}
      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={signOut}
      >
        <LogOut size={20} color={theme.colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Reycin USA v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textGray,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: "flex-start",
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.black,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.darkGray,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderGray,
    marginHorizontal: theme.spacing.md,
  },
  menuSection: {
    marginTop: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.white,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 8,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    color: theme.colors.textGray,
    fontSize: 12,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
});