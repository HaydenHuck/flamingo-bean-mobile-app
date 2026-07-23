import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { linkGuestOrder } from "../services/customerOrders";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type AccountScreenProps = NativeStackScreenProps<RootStackParamList, "Account">;

export function AccountScreen({ navigation }: AccountScreenProps) {
  const { getIdToken, isAuthenticated, isLoading, logout, user } = useCustomerAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [guestOrderNumber, setGuestOrderNumber] = useState("");
  const [guestAccessToken, setGuestAccessToken] = useState("");

  async function handleLogout() {
    await logout();
    navigation.navigate("Products");
  }

  async function handleLinkGuestOrders() {
    const token = await getIdToken();

    if (!token) {
      return;
    }

    try {
      setIsLinking(true);
      const result = await linkGuestOrder(
        guestOrderNumber.trim(),
        guestAccessToken.trim(),
        token,
      );
      setMessage(result.message);
    } catch {
      setMessage("We could not link guest orders right now.");
    } finally {
      setIsLinking(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerCard}>
          <ActivityIndicator color={theme.colors.coffee} />
          <Text style={styles.centerText}>Checking your account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.heading}>{isAuthenticated ? "Your Flamingo Bean account" : "Coffee, your way"}</Text>
          <Text style={styles.copy}>
            {isAuthenticated
              ? `Signed in as ${user?.email ?? "your account"}.`
              : "Accounts are optional. Log in to see your Flamingo Bean orders."}
          </Text>

          {isAuthenticated ? (
            <>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("MyOrders")}>
                <Text style={styles.primaryButtonText}>View My Orders</Text>
              </Pressable>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setGuestOrderNumber}
                placeholder="Guest order number"
                placeholderTextColor="#8b9b95"
                style={styles.input}
                value={guestOrderNumber}
              />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setGuestAccessToken}
                placeholder="Guest access token"
                placeholderTextColor="#8b9b95"
                style={styles.input}
                value={guestAccessToken}
              />
              <Pressable
                disabled={isLinking || !guestOrderNumber.trim() || !guestAccessToken.trim()}
                style={[styles.secondaryButton, isLinking && styles.disabledSecondary]}
                onPress={handleLinkGuestOrders}
              >
                <Text style={styles.secondaryButtonText}>{isLinking ? "Linking..." : "Link guest orders"}</Text>
              </Pressable>
              {message ? <Text style={styles.message}>{message}</Text> : null}
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("CustomerLogin")}>
                <Text style={styles.primaryButtonText}>Log In</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CustomerSignup")}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  centerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    margin: theme.spacing.xl,
    padding: theme.spacing.xl,
  },
  centerText: {
    color: theme.colors.textMuted,
    fontWeight: "800",
    marginTop: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.flamingoDark,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.md,
    minHeight: 48,
    justifyContent: "center",
  },
  input: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 15,
    marginTop: theme.spacing.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  disabledSecondary: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: theme.colors.coffee,
    fontSize: 15,
    fontWeight: "900",
  },
  message: {
    color: theme.colors.sage,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: theme.spacing.md,
  },
  logoutButton: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.flamingoDark,
    fontSize: 15,
    fontWeight: "900",
  },
});
