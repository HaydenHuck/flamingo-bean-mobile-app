import { useEffect, useState } from "react";
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

import { ProductCard } from "../components/ProductCard";
import { fetchProducts } from "../services/products";
import { theme } from "../theme";
import type { RootStackParamList } from "../types/navigation";
import type { Product } from "../types/product";

type ProductsScreenProps = NativeStackScreenProps<RootStackParamList, "Products">;

export function ProductsScreen({ navigation }: ProductsScreenProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    try {
      setIsLoading(true);
      setError(null);
      const productList = await fetchProducts();
      setProducts(productList);
    } catch {
      setError("We could not load the coffee menu. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Flamingo Bean</Text>
          <Text style={styles.heading}>Coffee Menu</Text>
          <Text style={styles.subheading}>Fresh-roasted coffee for pickup and mobile ordering.</Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroActionButton} onPress={() => navigation.navigate("MyOrders")}>
              <Text style={styles.heroActionText}>My Orders</Text>
            </Pressable>
            <Pressable style={styles.heroActionButtonSecondary} onPress={() => navigation.navigate("Account")}>
              <Text style={styles.heroActionTextSecondary}>Account</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={theme.colors.coffee} size="large" />
            <Text style={styles.stateText}>Brewing your menu...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Menu unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadProducts}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error ? (
          <View style={styles.productList}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate("ProductDetail", { product })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
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
    paddingBottom: 36,
  },
  hero: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.soft,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: theme.colors.flamingo,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandMarkText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  brandCopy: {
    flex: 1,
  },
  brand: {
    color: theme.colors.flamingoDark,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  welcome: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  heading: {
    color: theme.colors.text,
    fontSize: theme.typography.hero,
    fontWeight: "900",
    lineHeight: 40,
  },
  subheading: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.bodyLarge,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  heroActionButton: {
    alignItems: "center",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.md,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  heroActionButtonSecondary: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  heroActionText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  heroActionTextSecondary: {
    color: theme.colors.coffee,
    fontSize: 14,
    fontWeight: "900",
  },
  stateContainer: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: 28,
    ...theme.shadows.soft,
  },
  stateText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
    marginTop: theme.spacing.md,
  },
  errorCard: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: "#f0b8ad",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  errorTitle: {
    color: theme.colors.danger,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.coffee,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  productList: {
    gap: 0,
  },
});
