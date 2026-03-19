import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { theme } from "@/constants/theme";
import {
  User,
  Package,
  LogOut,
  ChevronRight,
  Pencil,
  X,
  Check,
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useMutation } from "@tanstack/react-query";

export default function AccountScreen() {
  const { profile, signOut, updateProfile } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameError, setFirstNameError] = useState("");

  const openEditModal = useCallback(() => {
    const parts = (profile?.displayName || "Driver").split(" ");
    setFirstName(profile?.firstName ?? parts[0] ?? "");
    setLastName(profile?.lastName ?? parts.slice(1).join(" ") ?? "");
    setFirstNameError("");
    setEditModalVisible(true);
  }, [profile]);

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      const trimFirst = firstName.trim();
      const trimLast = lastName.trim();
      if (!trimFirst) throw new Error("First name is required");
      const displayName = trimLast ? `${trimFirst} ${trimLast}` : trimFirst;
      await updateProfile({ firstName: trimFirst, lastName: trimLast, displayName });
    },
    onSuccess: () => {
      setEditModalVisible(false);
    },
    onError: (err: any) => {
      if (err.message === "First name is required") {
        setFirstNameError("First name is required");
      }
    },
  });

  const handleSave = useCallback(() => {
    setFirstNameError("");
    updateNameMutation.mutate();
  }, [updateNameMutation]);

  const displayName = profile?.displayName || "Driver";

  const menuItems = [
    {
      icon: Package,
      title: "Orders",
      subtitle: "View order history",
      onPress: () => {},
    },
  ];

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={40} color={theme.colors.white} strokeWidth={1.5} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <TouchableOpacity
                style={styles.editNameBtn}
                onPress={openEditModal}
                testID="edit-name-btn"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Pencil size={15} color={theme.colors.textGray} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>
        </View>

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
        </View>

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

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Reycin USA v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textGray} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>First Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, !!firstNameError && styles.inputError]}
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  if (t.trim()) setFirstNameError("");
                }}
                placeholder="First name"
                placeholderTextColor={theme.colors.textGray}
                autoCapitalize="words"
                autoCorrect={false}
                testID="first-name-input"
              />
              {!!firstNameError && (
                <Text style={styles.errorText}>{firstNameError}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Last Name <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={theme.colors.textGray}
                autoCapitalize="words"
                autoCorrect={false}
                testID="last-name-input"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                updateNameMutation.isPending && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={updateNameMutation.isPending}
              testID="save-name-btn"
            >
              {updateNameMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.black} />
              ) : (
                <>
                  <Check size={18} color={theme.colors.black} strokeWidth={2.5} />
                  <Text style={styles.saveButtonText}>Save Name</Text>
                </>
              )}
            </TouchableOpacity>

            {updateNameMutation.isError && !firstNameError && (
              <Text style={styles.mutationError}>
                Something went wrong. Please try again.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
  },
  editNameBtn: {
    padding: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textGray,
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
    borderColor: "#EF4444",
    gap: 8,
  },
  signOutText: {
    color: "#EF4444",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: theme.colors.darkGray,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderGray,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.white,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textGray,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: theme.colors.error,
  },
  optional: {
    color: theme.colors.textGray,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 0,
    fontSize: 12,
  },
  input: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.white,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 6,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 15,
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: "700",
  },
  mutationError: {
    color: theme.colors.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
});
