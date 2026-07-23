import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CartHeaderButton } from "../components/CartHeaderButton";
import { CartProvider } from "../contexts/CartContext";
import { CustomerAuthProvider } from "../contexts/CustomerAuthContext";
import { AccountScreen } from "../screens/AccountScreen";
import { CartScreen } from "../screens/CartScreen";
import { CustomerLoginScreen } from "../screens/CustomerLoginScreen";
import { CustomerOrderDetailScreen } from "../screens/CustomerOrderDetailScreen";
import { CustomerSignupScreen } from "../screens/CustomerSignupScreen";
import { MyOrdersScreen } from "../screens/MyOrdersScreen";
import { OrderConfirmationScreen } from "../screens/OrderConfirmationScreen";
import { PaymentPendingScreen } from "../screens/PaymentPendingScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppRoot() {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              contentStyle: { backgroundColor: "#f4f7f2" },
              headerRight: () => (
                <CartHeaderButton onPress={() => navigation.navigate("Cart")} />
              ),
              headerShadowVisible: false,
              headerStyle: { backgroundColor: "#f4f7f2" },
              headerTintColor: "#0f766e",
              headerTitleStyle: {
                color: "#18211f",
                fontWeight: "800",
              },
            })}
          >
            <Stack.Screen
              name="Products"
              component={ProductsScreen}
              options={{ title: "Flamingo Bean" }}
            />

            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={({ route }) => ({ title: route.params.product.name })}
            />

            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{
                headerRight: undefined,
                title: "Cart",
              }}
            />

            <Stack.Screen
              name="OrderConfirmation"
              component={OrderConfirmationScreen}
              options={{
                headerRight: undefined,
                title: "Order Confirmed",
              }}
            />

            <Stack.Screen
              name="PaymentPending"
              component={PaymentPendingScreen}
              options={{
                headerRight: undefined,
                title: "Payment Pending",
              }}
            />

            <Stack.Screen
              name="Account"
              component={AccountScreen}
              options={{ title: "Account" }}
            />

            <Stack.Screen
              name="CustomerLogin"
              component={CustomerLoginScreen}
              options={{
                headerRight: undefined,
                title: "Log In",
              }}
            />

            <Stack.Screen
              name="CustomerSignup"
              component={CustomerSignupScreen}
              options={{
                headerRight: undefined,
                title: "Create Account",
              }}
            />

            <Stack.Screen
              name="MyOrders"
              component={MyOrdersScreen}
              options={{
                headerRight: undefined,
                title: "My Orders",
              }}
            />

            <Stack.Screen
              name="CustomerOrderDetail"
              component={CustomerOrderDetailScreen}
              options={({ route }) => ({
                headerRight: undefined,
                title: route.params.orderId,
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
