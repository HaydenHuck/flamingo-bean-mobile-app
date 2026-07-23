import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { fetchCustomerOrder } from "../services/customerOrders";
import { fetchGuestOrder } from "../services/orders";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";
import type { OrderConfirmation, OrderItemResponse, OrderStatus } from "../types/order";

type OrderConfirmationScreenProps = NativeStackScreenProps<RootStackParamList, "OrderConfirmation">;

const TRACKING_STEPS: OrderStatus[] = ["received", "preparing", "ready", "completed"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function OrderConfirmationScreen({ navigation, route }: OrderConfirmationScreenProps) {
  const { getIdToken, isAuthenticated } = useCustomerAuth();
  const [order, setOrder] = useState<OrderConfirmation>(route.params.order);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      setError(null);
      const updatedOrder = route.params.guestAccessToken
        ? await fetchGuestOrder(order.order_number, route.params.guestAccessToken)
        : await fetchCustomerOrder(order.order_number, requireToken(await getIdToken()));
      setOrder(updatedOrder);
    } catch {
      setError("We could not refresh this order. Please try again in a moment.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.confirmationCard}>
          <Text style={styles.eyebrow}>Order Tracking</Text>
          <Text style={styles.heading}>Thanks, {order.customer_name}</Text>
          <Text style={styles.message}>{getCustomerMessage(order)}</Text>

          <View style={styles.orderNumberBox}>
            <Text style={styles.orderNumberLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
          </View>
        </View>

        {!isAuthenticated ? (
          <View style={styles.accountPromptCard}>
            <Text style={styles.accountPromptTitle}>Create an account to save this order and view future updates.</Text>
            <Text style={styles.accountPromptText}>
              Use the same verified email plus the guest order number and access token shown after checkout.
            </Text>
            <Pressable style={styles.accountPromptButton} onPress={() => navigation.navigate("CustomerSignup")}>
              <Text style={styles.accountPromptButtonText}>Create Account</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusGroup}>
              <Text style={styles.statusLabel}>Payment</Text>
              <Text style={[styles.statusValue, getPaymentStatusStyle(order.payment_status)]}>
                {formatStatus(order.payment_status)}
              </Text>
            </View>
            <View style={styles.statusGroupRight}>
              <Text style={styles.statusLabel}>Order</Text>
              <Text style={styles.statusValue}>{formatStatus(order.status)}</Text>
            </View>
          </View>

          <Text style={styles.paymentMessage}>{getPaymentMessage(order)}</Text>

          <Pressable
            disabled={isRefreshing}
            onPress={handleRefresh}
            style={({ pressed }) => [
              styles.refreshButton,
              isRefreshing ? styles.refreshButtonDisabled : null,
              pressed ? styles.refreshButtonPressed : null,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.refreshButtonText}>Refresh Status</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          {TRACKING_STEPS.map((step) => (
            <TimelineStep key={step} order={order} step={step} />
          ))}
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label="Customer" value={order.customer_name} />
          <DetailRow label="Fulfillment" value={formatStatus(order.fulfillment_type)} />
          {order.fulfillment_type === "pickup" && order.pickup_time ? (
            <DetailRow label="Pickup time" value={order.pickup_time} />
          ) : null}
          {order.fulfillment_type === "shipping" ? (
            <DetailRow label="Ship to" value={formatShippingAddress(order)} />
          ) : null}
          <DetailRow label="Created" value={formatDate(order.created_at)} />
          <DetailRow label="Updated" value={formatDate(order.updated_at)} />
        </View>

        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item) => (
            <OrderItemRow item={item} key={`${item.product_id}-${item.name}-${item.size}`} />
          ))}
        </View>

        <View style={styles.totalsCard}>
          <DetailRow label="Subtotal" value={currencyFormatter.format(order.subtotal)} />
          <DetailRow label="Tax" value={currencyFormatter.format(order.tax)} />
          <DetailRow label="Shipping" value={currencyFormatter.format(order.shipping_fee)} />
          <DetailRow label="Total" value={currencyFormatter.format(order.total)} isTotal />
        </View>

        <Pressable style={styles.menuButton} onPress={() => navigation.navigate("Products")}>
          <Text style={styles.menuButtonText}>Back to Menu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function requireToken(token: string | null) {
  if (!token) {
    throw new Error("Customer authentication is required.");
  }
  return token;
}

interface TimelineStepProps {
  order: OrderConfirmation;
  step: OrderStatus;
}

function TimelineStep({ order, step }: TimelineStepProps) {
  const stepState = getTimelineStepState(order.status, step);

  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineDot,
          stepState === "complete" ? styles.timelineDotComplete : null,
          stepState === "current" ? styles.timelineDotCurrent : null,
        ]}
      >
        <Text style={[styles.timelineDotText, stepState === "upcoming" ? styles.timelineDotTextUpcoming : null]}>
          {stepState === "current" ? "" : ""}
        </Text>
      </View>
      <View style={styles.timelineTextGroup}>
        <Text style={[styles.timelineTitle, stepState === "upcoming" ? styles.timelineTitleUpcoming : null]}>
          {formatStatus(step)}
        </Text>
        <Text style={styles.timelineHelp}>{getTimelineHelp(step)}</Text>
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  isTotal?: boolean;
}

function DetailRow({ label, value, isTotal = false }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isTotal ? styles.totalLabel : null]}>{label}</Text>
      <Text style={[styles.detailValue, isTotal ? styles.totalValue : null]}>{value}</Text>
    </View>
  );
}

interface OrderItemRowProps {
  item: OrderItemResponse;
}

function OrderItemRow({ item }: OrderItemRowProps) {
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

function getCustomerMessage(order: OrderConfirmation) {
  if (order.status === "ready") {
    return order.fulfillment_type === "shipping"
      ? "Your order is ready for shipment."
      : "Your order is ready for pickup.";
  }

  if (order.payment_status === "pending_payment") {
    return "Waiting for payment confirmation...";
  }

  if (order.payment_status === "paid") {
    return "Payment confirmed. We will keep this page updated as your coffee moves along.";
  }

  if (order.payment_status === "payment_failed") {
    return "Payment did not complete. Please return to checkout or ask the cafe team for help.";
  }

  if (order.payment_status === "canceled" || order.status === "canceled") {
    return "This order has been canceled.";
  }

  return order.fulfillment_type === "shipping"
    ? "We have your Flamingo Bean order and will prepare it for shipping."
    : "We have your Flamingo Bean order and will prepare it for pickup.";
}

function getPaymentMessage(order: OrderConfirmation) {
  if (order.payment_status === "pending_payment") {
    return "Waiting for payment confirmation...";
  }

  if (order.payment_status === "paid") {
    return "Payment confirmed.";
  }

  if (order.payment_status === "payment_failed") {
    return "Payment failed.";
  }

  return "Payment canceled.";
}

function getTimelineStepState(currentStatus: OrderStatus, step: OrderStatus) {
  const currentIndex = TRACKING_STEPS.indexOf(currentStatus);
  const stepIndex = TRACKING_STEPS.indexOf(step);

  if (currentIndex === -1) {
    return "upcoming";
  }

  if (stepIndex < currentIndex) {
    return "complete";
  }

  if (stepIndex === currentIndex) {
    return "current";
  }

  return "upcoming";
}

function getTimelineHelp(step: OrderStatus) {
  switch (step) {
    case "received":
      return "The cafe has received your order.";
    case "preparing":
      return "Your coffee is being prepared.";
    case "ready":
      return "Your order is ready for pickup or shipment.";
    case "completed":
      return "The order is complete.";
    default:
      return "";
  }
}

function formatShippingAddress(order: OrderConfirmation) {
  const addressParts = [
    order.shipping_name,
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", "),
    order.shipping_country,
  ].filter(Boolean);

  return addressParts.join("\n");
}

function getPaymentStatusStyle(paymentStatus: string) {
  if (paymentStatus === "paid") {
    return styles.paidText;
  }

  if (paymentStatus === "pending_payment") {
    return styles.pendingText;
  }

  return styles.problemText;
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
  confirmationCard: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  accountPromptCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  accountPromptTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  accountPromptText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  accountPromptButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  accountPromptButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  eyebrow: {
    color: theme.colors.flamingoDark,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },
  orderNumberBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 16,
    padding: 13,
  },
  orderNumberLabel: {
    color: theme.colors.caramel,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  orderNumber: {
    color: theme.colors.coffee,
    fontSize: 21,
    fontWeight: "900",
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  statusTopRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  statusGroup: {
    flex: 1,
  },
  statusGroupRight: {
    alignItems: "flex-end",
    flex: 1,
  },
  statusLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  statusValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  paidText: {
    color: theme.colors.sage,
  },
  pendingText: {
    color: theme.colors.flamingoDark,
  },
  problemText: {
    color: theme.colors.danger,
  },
  paymentMessage: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 14,
    paddingTop: 14,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: 16,
    minHeight: 48,
    justifyContent: "center",
  },
  refreshButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  refreshButtonPressed: {
    opacity: 0.85,
  },
  refreshButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  errorCard: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: "#f0b8ad",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 18,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14,
  },
  timelineDot: {
    alignItems: "center",
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    marginTop: 1,
    width: 28,
  },
  timelineDotCurrent: {
    backgroundColor: theme.colors.coffee,
    borderColor: theme.colors.coffee,
  },
  timelineDotComplete: {
    backgroundColor: theme.colors.flamingo,
    borderColor: theme.colors.flamingo,
  },
  timelineDotText: {
    color: theme.colors.coffee,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 17,
  },
  timelineDotTextUpcoming: {
    color: theme.colors.disabled,
  },
  timelineTextGroup: {
    flex: 1,
  },
  timelineTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  timelineTitleUpcoming: {
    color: theme.colors.textMuted,
  },
  timelineHelp: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  itemsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 18,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
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
    lineHeight: 21,
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
    marginTop: 1,
  },
  totalsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  detailRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    paddingVertical: 15,
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
  menuButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 20,
    paddingVertical: 15,
  },
  menuButtonText: {
    color: theme.colors.coffee,
    fontSize: 16,
    fontWeight: "900",
  },
});
