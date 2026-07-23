import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCart } from "../contexts/CartContext";
import { theme } from "../theme";

interface CartHeaderButtonProps {
  onPress: () => void;
}

export function CartHeaderButton({ onPress }: CartHeaderButtonProps) {
  const { getCartItemCount } = useCart();
  const itemCount = getCartItemCount();

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>Cart</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{itemCount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  buttonText: {
    color: theme.colors.coffee,
    fontSize: 14,
    fontWeight: "900",
  },
  badge: {
    alignItems: "center",
    backgroundColor: theme.colors.flamingo,
    borderRadius: theme.radius.md,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
});
