import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import type { Product } from "../types/product";

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable
      accessibilityLabel={`View ${product.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.cardAccent} />
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.name}>{product.name}</Text>
        </View>
        <View style={styles.pricePill}>
          <Text style={styles.price}>{currencyFormatter.format(product.price)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{product.description}</Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Roast</Text>
          <Text style={styles.detailValue}>{product.roast_level}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Origin</Text>
          <Text style={styles.detailValue}>{product.origin}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Size</Text>
          <Text style={styles.detailValue}>{product.size}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardAccent: {
    backgroundColor: theme.colors.flamingo,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between",
    paddingTop: theme.spacing.xs,
  },
  titleGroup: {
    flex: 1,
  },
  category: {
    color: theme.colors.flamingoDark,
    fontSize: theme.typography.eyebrow,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: "900",
    lineHeight: 27,
  },
  pricePill: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  price: {
    color: theme.colors.coffee,
    fontSize: 17,
    fontWeight: "900",
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 22,
    marginTop: theme.spacing.md,
  },
  details: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  detailItem: {
    flex: 1,
    minWidth: 88,
  },
  detailLabel: {
    color: theme.colors.caramel,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
});
