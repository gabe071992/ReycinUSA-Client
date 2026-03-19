import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { theme } from "@/constants/theme";
import { AlertTriangle } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <AlertTriangle size={48} color={theme.colors.textGray} strokeWidth={1.5} />
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.subtitle}>This screen doesn't exist.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textGray,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
