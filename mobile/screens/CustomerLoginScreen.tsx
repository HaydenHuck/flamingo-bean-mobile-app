import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type CustomerLoginScreenProps = NativeStackScreenProps<RootStackParamList, "CustomerLogin">;

export function CustomerLoginScreen({ navigation }: CustomerLoginScreenProps) {
  const { isFirebaseConfigured, login } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
      navigation.replace("MyOrders");
    } catch {
      setError("We could not sign you in. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = isFirebaseConfigured && email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Flamingo Bean Account</Text>
          <Text style={styles.heading}>Log in</Text>
          <Text style={styles.copy}>View your orders and keep future coffee runs easier.</Text>

          {!isFirebaseConfigured ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Firebase is not configured for this app yet.</Text>
            </View>
          ) : null}

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8b9b95"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8b9b95"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable disabled={!canSubmit} onPress={handleLogin} style={[styles.primaryButton, !canSubmit && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color={theme.colors.surface} /> : <Text style={styles.primaryButtonText}>Log In</Text>}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CustomerSignup")}>
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </Pressable>
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
  eyebrow: {
    color: theme.colors.flamingoDark,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
  },
  heading: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.sm,
    minHeight: 48,
    justifyContent: "center",
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  secondaryButtonText: {
    color: theme.colors.coffee,
    fontSize: 15,
    fontWeight: "900",
  },
  notice: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: "#f0b8ad",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  noticeText: {
    color: theme.colors.danger,
    fontWeight: "800",
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: theme.spacing.sm,
  },
});
