import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { fetchCustomerOrders } from "../services/customerOrders";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";
import type { CustomerOrderSummary } from "../types/order";

type MyOrdersScreenProps = NativeStackScreenProps<RootStackParamList, "MyOrders">;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function MyOrdersScreen({ navigation }: MyOrdersScreenProps) {
  const { getIdToken, isAuthenticated, isLoading } = useCustomerAuth();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const token = await getIdToken();

    if (!token) {
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      setError(null);
      setOrders(await fetchCustomerOrders(token));
    } catch {
      setError("We could not load your orders. Please try again.");
    } finally {
      setIsFetching(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadOrders();
    }
  }, [isAuthenticated, loadOrders]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.colors.coffee} />
          <Text style={styles.stateText}>Checking your account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Log in or create an account to view your orders.</Text>
            <Text style={styles.stateText}>Guest checkout still works without an account.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("CustomerLogin")}>
              <Text style={styles.primaryButtonText}>Log In</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("CustomerSignup")}>
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.heading}>My Orders</Text>
          <Text style={styles.copy}>Track current and past Flamingo Bean orders linked to this account.</Text>
        </View>

        {isFetching ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={theme.colors.coffee} />
            <Text style={styles.stateText}>Loading your orders...</Text>
          </View>
        ) : null}

        {!isFetching && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadOrders}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {!isFetching && !error && orders.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No orders linked yet.</Text>
            <Text style={styles.stateText}>Your logged-in checkouts will appear here.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Products")}>
              <Text style={styles.primaryButtonText}>Browse Menu</Text>
            </Pressable>
          </View>
        ) : null}

        {!isFetching && !error
          ? orders.map((order) => (
              <Pressable
                key={order.order_id}
                style={styles.orderCard}
                onPress={() => navigation.navigate("CustomerOrderDetail", { orderId: order.order_id })}
              >
                <View style={styles.orderTopRow}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <Text style={styles.total}>{currencyFormatter.format(order.total)}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <StatusBadge value={order.payment_status} />
                  <StatusBadge value={order.status} />
                  <StatusBadge value={order.fulfillment_type} />
                </View>
                <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
              </Pressable>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <Text style={styles.badge}>{formatStatus(value)}</Text>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: 34,
  },
  header: {
    marginBottom: theme.spacing.xl,
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
    marginTop: theme.spacing.sm,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  stateTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
    textAlign: "center",
  },
  stateText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  orderTopRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between",
  },
  orderNumber: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  total: {
    color: theme.colors.coffee,
    fontSize: 18,
    fontWeight: "900",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing.md,
  },
  badge: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.coffee,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: theme.spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    width: "100%",
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
    paddingHorizontal: theme.spacing.lg,
    width: "100%",
  },
  secondaryButtonText: {
    color: theme.colors.coffee,
    fontSize: 15,
    fontWeight: "900",
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    textAlign: "center",
  },
});
