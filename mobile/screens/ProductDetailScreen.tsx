import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCart } from "../contexts/CartContext";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type ProductDetailScreenProps = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductDetailScreen({ navigation, route }: ProductDetailScreenProps) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const hasImage = product.image_url.trim().length > 0;

  function handleAddToCart() {
    addToCart(product);
    setShowConfirmation(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </Pressable>

        {hasImage ? (
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <View style={styles.placeholderBadge}>
              <Text style={styles.placeholderBadgeText}>FB</Text>
            </View>
            <Text style={styles.placeholderBrand}>Flamingo Bean</Text>
            <Text style={styles.placeholderText}>Fresh roast image coming soon</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.category}>{product.category}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.price}>{currencyFormatter.format(product.price)}</Text>
            </View>
          </View>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label="Roast Level" value={product.roast_level} />
          <DetailRow label="Origin" value={product.origin} />
          <DetailRow label="Size" value={product.size} />
          <DetailRow label="Status" value={product.active ? "Available" : "Unavailable"} />
        </View>

        {showConfirmation ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationText}>Added to cart.</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!product.active}
          onPress={handleAddToCart}
          style={({ pressed }) => [
            styles.addToCartButton,
            !product.active ? styles.addToCartButtonDisabled : null,
            pressed ? styles.addToCartButtonPressed : null,
          ]}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  backButton: {
    alignSelf: "flex-start",
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.coffee,
    fontSize: 15,
    fontWeight: "900",
  },
  image: {
    aspectRatio: 1.55,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.card,
    width: "100%",
    ...theme.shadows.soft,
  },
  imagePlaceholder: {
    alignItems: "center",
    aspectRatio: 1.55,
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    width: "100%",
    ...theme.shadows.soft,
  },
  placeholderBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.flamingo,
    borderRadius: theme.radius.md,
    height: 52,
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    width: 52,
  },
  placeholderBadgeText: {
    color: theme.colors.surface,
    fontSize: 17,
    fontWeight: "900",
  },
  placeholderBrand: {
    color: theme.colors.flamingoDark,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  header: {
    marginTop: theme.spacing.xl,
  },
  category: {
    color: theme.colors.flamingoDark,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  name: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  priceBox: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    minWidth: 104,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  priceLabel: {
    color: theme.colors.caramel,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  price: {
    color: theme.colors.coffee,
    fontSize: 22,
    fontWeight: "900",
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: theme.spacing.md,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.soft,
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
    fontWeight: "900",
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  addToCartButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.card,
    marginTop: theme.spacing.xl,
    paddingVertical: 15,
    ...theme.shadows.soft,
  },
  addToCartButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  addToCartButtonPressed: {
    opacity: 0.85,
  },
  addToCartText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  confirmation: {
    backgroundColor: theme.colors.sageSoft,
    borderColor: "#9fcfbd",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirmationText: {
    color: theme.colors.sage,
    fontSize: 15,
    fontWeight: "900",
  },
});
