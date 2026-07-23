import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { fetchCustomerOrder } from "../services/customerOrders";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";
import type { OrderConfirmation, OrderItemResponse } from "../types/order";

type CustomerOrderDetailScreenProps = NativeStackScreenProps<RootStackParamList, "CustomerOrderDetail">;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function CustomerOrderDetailScreen({ navigation, route }: CustomerOrderDetailScreenProps) {
  const { getIdToken, isAuthenticated, isLoading } = useCustomerAuth();
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    const token = await getIdToken();

    if (!token) {
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      setError(null);
      setOrder(await fetchCustomerOrder(route.params.orderId, token));
    } catch {
      setError("We could not load this order.");
    } finally {
      setIsFetching(false);
    }
  }, [getIdToken, route.params.orderId]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadOrder();
    }
  }, [isAuthenticated, loadOrder]);

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
            <Text style={styles.stateTitle}>Log in to view this order.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("CustomerLogin")}>
              <Text style={styles.primaryButtonText}>Log In</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isFetching) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.colors.coffee} />
          <Text style={styles.stateText}>Refreshing order status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadOrder}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {order ? (
          <>
            <View style={styles.headerCard}>
              <Text style={styles.eyebrow}>Order</Text>
              <Text style={styles.heading}>{order.order_number}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge value={order.payment_status} />
                <StatusBadge value={order.status} />
                <StatusBadge value={order.fulfillment_type} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Fulfillment</Text>
              <DetailRow label="Type" value={formatStatus(order.fulfillment_type)} />
              {order.fulfillment_type === "pickup" && order.pickup_time ? (
                <DetailRow label="Pickup time" value={order.pickup_time} />
              ) : null}
              {order.fulfillment_type === "shipping" ? (
                <DetailRow label="Ship to" value={formatShippingAddress(order)} />
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items</Text>
              {order.items.map((item) => (
                <OrderItemRow item={item} key={`${item.product_id}-${item.name}-${item.size}`} />
              ))}
            </View>

            <View style={styles.card}>
              <DetailRow label="Subtotal" value={currencyFormatter.format(order.subtotal)} />
              <DetailRow label="Tax" value={currencyFormatter.format(order.tax)} />
              <DetailRow label="Shipping" value={currencyFormatter.format(order.shipping_fee)} />
              <DetailRow label="Total" value={currencyFormatter.format(order.total)} strong />
            </View>

            <Pressable style={styles.primaryButton} onPress={loadOrder}>
              <Text style={styles.primaryButtonText}>Refresh Status</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <Text style={styles.badge}>{formatStatus(value)}</Text>;
}

function DetailRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, strong && styles.totalLabel]}>{label}</Text>
      <Text style={[styles.detailValue, strong && styles.totalValue]}>{value}</Text>
    </View>
  );
}

function OrderItemRow({ item }: { item: OrderItemResponse }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>
          {item.size} x {item.quantity} at {currencyFormatter.format(item.price)}
        </Text>
      </View>
      <Text style={styles.itemTotal}>{currencyFormatter.format(item.line_total)}</Text>
    </View>
  );
}

function formatShippingAddress(order: OrderConfirmation) {
  const cityLine = [order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", ");
  return [
    order.shipping_name,
    order.shipping_address_line1,
    order.shipping_address_line2,
    cityLine,
    order.shipping_country,
  ]
    .filter(Boolean)
    .join("\n");
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
  headerCard: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    margin: theme.spacing.xl,
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing.lg,
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
  detailRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  totalLabel: {
    color: theme.colors.text,
    fontSize: 17,
  },
  totalValue: {
    color: theme.colors.coffee,
    fontSize: 19,
    fontWeight: "900",
  },
  itemRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  itemMeta: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  itemTotal: {
    color: theme.colors.coffee,
    fontSize: 16,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
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
  },
  secondaryButtonText: {
    color: theme.colors.coffee,
    fontSize: 15,
    fontWeight: "900",
  },
  stateTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    textAlign: "center",
  },
});
