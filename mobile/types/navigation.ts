import type { Product } from "./product";
import type { CheckoutSession, OrderConfirmation } from "./order";

export type RootStackParamList = {
  Products: undefined;
  ProductDetail: {
    product: Product;
  };
  Cart: undefined;
  OrderConfirmation: {
    guestAccessToken?: string | null;
    order: OrderConfirmation;
  };
  PaymentPending: {
    checkout: CheckoutSession;
  };
  Account: undefined;
  CustomerLogin: undefined;
  CustomerSignup: undefined;
  MyOrders: undefined;
  CustomerOrderDetail: {
    orderId: string;
  };
};
