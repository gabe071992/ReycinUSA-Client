import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ref, onValue } from "firebase/database";
import { brgDatabase } from "@/config/firebase-brg";
import { useBRGAuth } from "@/providers/BRGAuthProvider";
import { theme } from "@/constants/theme";
import {
  ChevronLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Truck,
  ShieldAlert,
} from "lucide-react-native";

interface TrackingUpdate {
  timestamp: string;
  status: string;
  location: string;
}

interface TrackingInfo {
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  estimatedDelivery: string | null;
  updates: TrackingUpdate[];
}

interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDetails {
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  orderDate: string;
}

interface Invoice {
  id: string;
  type: string;
  details: OrderDetails;
  status: "pending" | "approved" | "rejected" | "paid";
  createdAt: string;
  invoiceLink: string | null;
  isPaid: boolean;
  trackingInfo: TrackingInfo | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: theme.colors.error,
    bg: "rgba(239,68,68,0.1)",
    icon: XCircle,
  },
  paid: {
    label: "Paid",
    color: theme.colors.success,
    bg: "rgba(52,199,89,0.12)",
    icon: CheckCircle,
  },
};

const TRACKING_LABELS: Record<string, string> = {
  awaiting_shipment: "Awaiting Shipment",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { brgUser, brgLoading, isBRGAuthenticated } = useBRGAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!brgUser) {
      setLoading(false);
      return;
    }

    const invoicesRef = ref(
      brgDatabase,
      `Blackrock/public-ledger/invoices/${brgUser.uid}`
    );

    const unsubscribe = onValue(
      invoicesRef,
      (snapshot) => {
        const data = snapshot.val();
        console.log("BRG invoices fetched:", data ? Object.keys(data).length : 0);
        if (data) {
          const list: Invoice[] = Object.entries(data).map(
            ([key, val]: [string, any]) => ({
              ...val,
              id: key,
            })
          );
          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setInvoices(list);
        } else {
          setInvoices([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching BRG invoices:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [brgUser]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePayInvoice = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      console.error("Could not open invoice URL:", url);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (n: number) => `$${n.toFixed(2)}`;

  if (brgLoading || loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={24} color={theme.colors.white} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.white} />
        </View>
      </View>
    );
  }

  if (!isBRGAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={24} color={theme.colors.white} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <ShieldAlert size={40} color={theme.colors.textGray} strokeWidth={1} />
          </View>
          <Text style={styles.emptyTitle}>BRG Account Required</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to your Blackrock Resource Group invoice account to view your orders.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push("/brg-auth" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Sign In to BRG</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.colors.white} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.backBtn} />
      </View>

      {invoices.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Package size={40} color={theme.colors.textGray} strokeWidth={1} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Your order history will appear here after your first purchase.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {invoices.map((invoice) => {
            const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const isOpen = expanded[invoice.id];
            const itemCount = invoice.details?.items?.length ?? 0;
            const hasInvoiceLink =
              invoice.status === "approved" && invoice.invoiceLink;
            const hasTracking =
              invoice.trackingInfo?.trackingNumber !== null &&
              invoice.trackingInfo?.trackingNumber !== undefined;

            return (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => toggleExpand(invoice.id)}
                activeOpacity={0.85}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceHeaderLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <StatusIcon size={12} color={statusCfg.color} strokeWidth={2} />
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                    <Text style={styles.invoiceDate}>{formatDate(invoice.createdAt)}</Text>
                  </View>
                  <View style={styles.invoiceHeaderRight}>
                    <Text style={styles.invoiceTotal}>
                      {formatPrice(invoice.details?.total ?? 0)}
                    </Text>
                    <Text style={styles.invoiceItemCount}>
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.invoiceExpanded}>
                    <View style={styles.divider} />

                    {invoice.details?.items?.map((item, idx) => (
                      <View key={`${item.id}-${idx}`} style={styles.lineItem}>
                        <View style={styles.lineItemInfo}>
                          <Text style={styles.lineItemName} numberOfLines={2}>{item.name}</Text>
                          <Text style={styles.lineItemQty}>× {item.quantity}</Text>
                        </View>
                        <Text style={styles.lineItemPrice}>
                          {formatPrice(item.price * item.quantity)}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.subtotalSection}>
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Subtotal</Text>
                        <Text style={styles.subtotalValue}>
                          {formatPrice(invoice.details?.subtotal ?? 0)}
                        </Text>
                      </View>
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Shipping</Text>
                        <Text style={styles.subtotalValue}>
                          {formatPrice(invoice.details?.shipping ?? 0)}
                        </Text>
                      </View>
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Tax</Text>
                        <Text style={styles.subtotalValue}>
                          {formatPrice(invoice.details?.tax ?? 0)}
                        </Text>
                      </View>
                    </View>

                    {hasInvoiceLink && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handlePayInvoice(invoice.invoiceLink!)}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={16} color="#000" strokeWidth={2} />
                        <Text style={styles.payBtnText}>Pay Invoice</Text>
                      </TouchableOpacity>
                    )}

                    {hasTracking && invoice.trackingInfo && (
                      <View style={styles.trackingSection}>
                        <View style={styles.trackingHeader}>
                          <Truck size={14} color="#60A5FA" strokeWidth={1.8} />
                          <Text style={styles.trackingTitle}>Tracking</Text>
                        </View>
                        <View style={styles.trackingRow}>
                          <Text style={styles.trackingLabel}>Status</Text>
                          <Text style={styles.trackingValue}>
                            {TRACKING_LABELS[invoice.trackingInfo.status] ?? invoice.trackingInfo.status}
                          </Text>
                        </View>
                        {invoice.trackingInfo.trackingNumber && (
                          <View style={styles.trackingRow}>
                            <Text style={styles.trackingLabel}>Tracking #</Text>
                            <Text style={styles.trackingValue}>
                              {invoice.trackingInfo.trackingNumber}
                            </Text>
                          </View>
                        )}
                        {invoice.trackingInfo.carrier && (
                          <View style={styles.trackingRow}>
                            <Text style={styles.trackingLabel}>Carrier</Text>
                            <Text style={styles.trackingValue}>
                              {invoice.trackingInfo.carrier}
                            </Text>
                          </View>
                        )}
                        {invoice.trackingInfo.estimatedDelivery && (
                          <View style={styles.trackingRow}>
                            <Text style={styles.trackingLabel}>Est. Delivery</Text>
                            <Text style={styles.trackingValue}>
                              {formatDate(invoice.trackingInfo.estimatedDelivery)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {invoice.status === "pending" && (
                      <Text style={styles.pendingNote}>
                        Your order is under review. We'll send a payment link once approved.
                      </Text>
                    )}
                    {invoice.status === "rejected" && (
                      <Text style={styles.rejectedNote}>
                        This order was declined. Please contact support for more information.
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.white,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  signInBtn: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.black,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceHeaderLeft: {
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  invoiceDate: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  invoiceHeaderRight: {
    alignItems: "flex-end",
  },
  invoiceTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.4,
  },
  invoiceItemCount: {
    fontSize: 12,
    color: theme.colors.textGray,
    marginTop: 2,
  },
  invoiceExpanded: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderGray,
    marginVertical: 14,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  lineItemInfo: {
    flex: 1,
    marginRight: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  lineItemName: {
    fontSize: 13,
    color: theme.colors.white,
    flex: 1,
  },
  lineItemQty: {
    fontSize: 13,
    color: theme.colors.textGray,
  },
  lineItemPrice: {
    fontSize: 13,
    color: theme.colors.white,
    fontWeight: "600",
  },
  subtotalSection: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subtotalLabel: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  subtotalValue: {
    fontSize: 12,
    color: theme.colors.white,
    fontWeight: "500",
  },
  payBtn: {
    backgroundColor: theme.colors.white,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  payBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.black,
  },
  trackingSection: {
    backgroundColor: "rgba(96,165,250,0.06)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  trackingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  trackingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#60A5FA",
    letterSpacing: 0.3,
  },
  trackingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackingLabel: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  trackingValue: {
    fontSize: 12,
    color: theme.colors.white,
    fontWeight: "500",
  },
  pendingNote: {
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
    lineHeight: 18,
  },
  rejectedNote: {
    fontSize: 12,
    color: theme.colors.error,
    textAlign: "center",
    lineHeight: 18,
  },
});
