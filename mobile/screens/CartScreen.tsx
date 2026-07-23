import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCart, type CartItem } from "../contexts/CartContext";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { createCheckout } from "../services/checkout";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type CartScreenProps = NativeStackScreenProps<RootStackParamList, "Cart">;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const ESTIMATED_TAX_RATE = 0.0825;
const FLAT_SHIPPING_FEE = 6.99;
type FulfillmentType = "pickup" | "shipping";

export function CartScreen({ navigation }: CartScreenProps) {
  const {
    items,
    clearCart,
    decreaseQuantity,
    getCartSubtotal,
    increaseQuantity,
    removeFromCart,
  } = useCart();
  const { getIdToken, isAuthenticated, user } = useCustomerAuth();
  const [customerName, setCustomerName] = useState("Flamingo Bean Guest");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "guest@flamingobean.local");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("pickup");
  const [pickupTime, setPickupTime] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingAddressLine1, setShippingAddressLine1] = useState("");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("USA");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const isEmpty = items.length === 0;
  const subtotal = getCartSubtotal();
  const estimatedTax = subtotal * ESTIMATED_TAX_RATE;
  const shippingFee = fulfillmentType === "shipping" ? FLAT_SHIPPING_FEE : 0;
  const estimatedTotal = subtotal + estimatedTax + shippingFee;
  const canCheckout = !isEmpty && !isCheckingOut && customerName.trim().length > 0 && customerEmail.trim().length > 0;

  useEffect(() => {
    if (user?.email && customerEmail === "guest@flamingobean.local") {
      setCustomerEmail(user.email);
    }
  }, [customerEmail, user?.email]);

  async function handleCheckout() {
    if (!canCheckout) {
      return;
    }

    const validationMessage = getFulfillmentValidationMessage();
    if (validationMessage) {
      setCheckoutError(validationMessage);
      setCheckoutMessage(null);
      return;
    }

    try {
      setIsCheckingOut(true);
      setCheckoutError(null);
      setCheckoutMessage("Preparing secure Square checkout...");
      const firebaseIdToken = isAuthenticated ? await getIdToken() : null;
      const checkout = await createCheckout({
        customerEmail: customerEmail.trim(),
        customerName: customerName.trim(),
        firebaseIdToken,
        fulfillmentType,
        pickupTime: pickupTime.trim(),
        shippingAddressLine1: shippingAddressLine1.trim(),
        shippingAddressLine2: shippingAddressLine2.trim(),
        shippingCity: shippingCity.trim(),
        shippingCountry: shippingCountry.trim(),
        shippingName: shippingName.trim(),
        shippingState: shippingState.trim(),
        shippingZip: shippingZip.trim(),
        items,
      });

      setCheckoutMessage("Redirecting to secure Square checkout...");
      await Linking.openURL(checkout.checkout_url);
      navigation.navigate("PaymentPending", { checkout });
    } catch {
      setCheckoutError("We could not start Square checkout. Please check the backend connection and try again.");
      setCheckoutMessage(null);
    } finally {
      setIsCheckingOut(false);
    }
  }

  function getFulfillmentValidationMessage() {
    if (fulfillmentType === "pickup") {
      return null;
    }

    const requiredShippingValues = [
      shippingName,
      shippingAddressLine1,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
    ];

    if (requiredShippingValues.some((value) => value.trim().length === 0)) {
      return "Add the shipping name, address, city, state, ZIP, and country before checkout.";
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>FB</Text>
            </View>
            <Text style={styles.emptyTitle}>Your cup is waiting</Text>
            <Text style={styles.emptyText}>Choose a Flamingo Bean roast and we will keep your order here.</Text>
            <Pressable style={styles.menuButton} onPress={() => navigation.navigate("Products")}>
              <Text style={styles.menuButtonText}>Browse Menu</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.heading}>Your Order</Text>
              <Pressable onPress={clearCart} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear Cart</Text>
              </Pressable>
            </View>

            <View style={styles.items}>
              {items.map((item) => (
                <CartItemCard
                  item={item}
                  key={item.productId}
                  onDecrease={() => decreaseQuantity(item.productId)}
                  onIncrease={() => increaseQuantity(item.productId)}
                  onRemove={() => removeFromCart(item.productId)}
                />
              ))}
            </View>

            <View style={styles.summaryCard}>
              <SummaryRow label="Subtotal" value={currencyFormatter.format(subtotal)} />
              <SummaryRow label="Estimated tax" value={currencyFormatter.format(estimatedTax)} />
              <SummaryRow label="Shipping" value={currencyFormatter.format(shippingFee)} />
              <SummaryRow label="Estimated total" value={currencyFormatter.format(estimatedTotal)} strong />
              <Text style={styles.summaryNote}>Final total is confirmed by the secure Square checkout.</Text>
            </View>

            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutTitle}>Checkout Details</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setCustomerName}
                placeholder="Customer name"
                placeholderTextColor="#8b9b95"
                style={styles.input}
                value={customerName}
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setCustomerEmail}
                placeholder="Customer email"
                placeholderTextColor="#8b9b95"
                style={styles.input}
                value={customerEmail}
              />
              <View style={styles.fulfillmentRow}>
                <Pressable
                  onPress={() => setFulfillmentType("pickup")}
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType === "pickup" ? styles.fulfillmentOptionSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType === "pickup" ? styles.fulfillmentTextSelected : null,
                    ]}
                  >
                    Pickup in store
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFulfillmentType("shipping")}
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType === "shipping" ? styles.fulfillmentOptionSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType === "shipping" ? styles.fulfillmentTextSelected : null,
                    ]}
                  >
                    Ship to me
                  </Text>
                </Pressable>
              </View>

              {fulfillmentType === "pickup" ? (
                <>
                  <Text style={styles.fieldHelp}>Optional pickup time or note</Text>
                  <TextInput
                    onChangeText={setPickupTime}
                    placeholder="Example: Today after 3 PM"
                    placeholderTextColor="#8b9b95"
                    style={styles.input}
                    value={pickupTime}
                  />
                </>
              ) : (
                <View style={styles.shippingFields}>
                  <Text style={styles.shippingNote}>Flat shipping: {currencyFormatter.format(FLAT_SHIPPING_FEE)}</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setShippingName}
                    placeholder="Shipping name"
                    placeholderTextColor="#8b9b95"
                    style={styles.input}
                    value={shippingName}
                  />
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setShippingAddressLine1}
                    placeholder="Address line 1"
                    placeholderTextColor="#8b9b95"
                    style={styles.input}
                    value={shippingAddressLine1}
                  />
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setShippingAddressLine2}
                    placeholder="Address line 2 (optional)"
                    placeholderTextColor="#8b9b95"
                    style={styles.input}
                    value={shippingAddressLine2}
                  />
                  <View style={styles.formRow}>
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={setShippingCity}
                      placeholder="City"
                      placeholderTextColor="#8b9b95"
                      style={[styles.input, styles.formRowInput]}
                      value={shippingCity}
                    />
                    <TextInput
                      autoCapitalize="characters"
                      onChangeText={setShippingState}
                      placeholder="State"
                      placeholderTextColor="#8b9b95"
                      style={[styles.input, styles.formRowInput]}
                      value={shippingState}
                    />
                  </View>
                  <View style={styles.formRow}>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={setShippingZip}
                      placeholder="ZIP"
                      placeholderTextColor="#8b9b95"
                      style={[styles.input, styles.formRowInput]}
                      value={shippingZip}
                    />
                    <TextInput
                      autoCapitalize="characters"
                      onChangeText={setShippingCountry}
                      placeholder="Country"
                      placeholderTextColor="#8b9b95"
                      style={[styles.input, styles.formRowInput]}
                      value={shippingCountry}
                    />
                  </View>
                </View>
              )}
            </View>

            {checkoutError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{checkoutError}</Text>
              </View>
            ) : null}

            {checkoutMessage ? (
              <View style={styles.checkoutMessageCard}>
                <Text style={styles.checkoutMessageText}>{checkoutMessage}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={!canCheckout}
              onPress={handleCheckout}
              style={({ pressed }) => [
                styles.checkoutButton,
                !canCheckout ? styles.checkoutButtonDisabled : null,
                pressed ? styles.checkoutButtonPressed : null,
              ]}
            >
              {isCheckingOut ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface CartItemCardProps {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

function CartItemCard({ item, onDecrease, onIncrease, onRemove }: CartItemCardProps) {
  const lineTotal = item.price * item.quantity;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>{item.size}</Text>
          <Text style={styles.unitPrice}>{currencyFormatter.format(item.price)} each</Text>
        </View>
        <Text style={styles.lineTotal}>{currencyFormatter.format(lineTotal)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.quantityControls}>
          <Pressable accessibilityLabel={`Decrease ${item.name}`} onPress={onDecrease} style={styles.quantityButton}>
            <Text style={styles.quantityButtonText}>-</Text>
          </Pressable>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Pressable accessibilityLabel={`Increase ${item.name}`} onPress={onIncrease} style={styles.quantityButton}>
            <Text style={styles.quantityButtonText}>+</Text>
          </Pressable>
        </View>

        <Pressable onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeButtonText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  strong?: boolean;
}

function SummaryRow({ label, value, strong = false }: SummaryRowProps) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong ? styles.summaryLabelStrong : null]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? styles.summaryValueStrong : null]}>{value}</Text>
    </View>
  );
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
  emptyCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.xxl,
    ...theme.shadows.soft,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.flamingo,
    borderRadius: theme.radius.md,
    height: 54,
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    width: 54,
  },
  emptyIconText: {
    color: theme.colors.surface,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  menuButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  clearButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: theme.colors.flamingoDark,
    fontSize: 14,
    fontWeight: "900",
  },
  items: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  itemTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  itemMeta: {
    color: theme.colors.caramel,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  unitPrice: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 5,
  },
  lineTotal: {
    color: theme.colors.coffee,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  controlsRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
  },
  quantityControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  quantityButtonText: {
    color: theme.colors.coffee,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
  },
  quantityText: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 22,
    textAlign: "center",
  },
  removeButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: theme.colors.flamingoDark,
    fontSize: 14,
    fontWeight: "900",
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.xs,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryLabelStrong: {
    color: theme.colors.text,
    fontSize: 18,
  },
  summaryValueStrong: {
    color: theme.colors.coffee,
    fontSize: 22,
    fontWeight: "900",
  },
  summaryNote: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  checkoutButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.xl,
    paddingVertical: 15,
    ...theme.shadows.soft,
  },
  checkoutButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  checkoutButtonPressed: {
    opacity: 0.85,
  },
  checkoutButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  checkoutCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  checkoutTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
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
  fulfillmentRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
    marginBottom: 12,
  },
  fulfillmentOption: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  fulfillmentOptionSelected: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
  },
  fulfillmentText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "900",
  },
  fulfillmentTextSelected: {
    color: theme.colors.coffee,
  },
  fieldHelp: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  shippingFields: {
    marginTop: 2,
  },
  shippingNote: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.coffee,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formRowInput: {
    flex: 1,
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
  checkoutMessageCard: {
    backgroundColor: theme.colors.sageSoft,
    borderColor: "#9fcfbd",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  checkoutMessageText: {
    color: theme.colors.sage,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
});
