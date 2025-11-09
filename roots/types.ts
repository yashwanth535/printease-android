// types.ts (or inside your file)
export type RootStackParamList = {
  Landing: undefined;
  Home: undefined;
  Vendors: undefined;
  Payments: undefined;
  Dashboard: undefined;
  Favourites: undefined;
  Notifications: undefined;
  Profile: undefined;
  Cart: undefined;
  Checkout: { selectedOrders: string[]; totalAmount: number } | undefined;
  CreateOrder: { vendorId?: string } | undefined;
  VendorProfile: { vendorId: string };
  PaymentSuccess: { order_id?: string; total_amount?: string } | undefined;
};
