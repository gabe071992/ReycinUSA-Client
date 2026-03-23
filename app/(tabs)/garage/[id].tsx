import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import type { Vehicle, EngineConfig, RepairEntry, DamageReport, Booking } from "@/providers/AuthProvider";
import {
  Car,
  Wrench,
  Activity,
  Calendar,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Zap,
  Weight,
  Gauge,
  BookOpen,
  ExternalLink,
} from "lucide-react-native";

type Section = "overview" | "engine" | "service" | "damage" | "bookings";

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: Car },
  { key: "engine", label: "Engine", icon: Zap },
  { key: "service", label: "Service", icon: Wrench },
  { key: "damage", label: "Damage", icon: AlertTriangle },
  { key: "bookings", label: "Reservations", icon: Calendar },
];

function SectionPill({ section, active, onPress }: { section: typeof SECTIONS[0]; active: boolean; onPress: () => void }) {
  const Icon = section.icon;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.75}
    >
      <Icon size={13} color={active ? theme.colors.black : theme.colors.textGray} strokeWidth={2} />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{section.label}</Text>
    </TouchableOpacity>
  );
}

export default function VehicleViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, updateVehicle, removeVehicle } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [editModal, setEditModal] = useState<"details" | "engine" | null>(null);
  const [addModal, setAddModal] = useState<"repair" | "damage" | "booking" | null>(null);
  const [saving, setSaving] = useState(false);

  const vehicle: Vehicle | undefined = useMemo(
    () => (id && profile?.vehicles ? profile.vehicles[id] : undefined),
    [id, profile]
  );

  const [detailsForm, setDetailsForm] = useState({
    nickname: vehicle?.nickname ?? "",
    vin: vehicle?.vin ?? "",
    mileage: vehicle?.mileage?.toString() ?? "",
    notes: vehicle?.notes ?? "",
    year: vehicle?.year?.toString() ?? "",
  });

  const [engineForm, setEngineForm] = useState<EngineConfig>({
    type: vehicle?.engineConfig?.type ?? "",
    displacement: vehicle?.engineConfig?.displacement ?? "",
    hp: vehicle?.engineConfig?.hp,
    torque: vehicle?.engineConfig?.torque,
    tuner: vehicle?.engineConfig?.tuner ?? "",
    fuelType: vehicle?.engineConfig?.fuelType ?? "",
    notes: vehicle?.engineConfig?.notes ?? "",
  });

  const [repairForm, setRepairForm] = useState<Partial<RepairEntry>>({
    type: "maintenance",
    title: "",
    description: "",
    mileage: undefined,
    cost: undefined,
    shop: "",
  });

  const [damageForm, setDamageForm] = useState<Partial<DamageReport>>({
    title: "",
    description: "",
    severity: "minor",
    repaired: false,
  });

  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    type: "service",
    title: "",
    location: "",
    notes: "",
    status: "pending",
  });

  const handleSaveDetails = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateVehicle(id, {
        nickname: detailsForm.nickname || undefined,
        vin: detailsForm.vin || undefined,
        mileage: detailsForm.mileage ? parseInt(detailsForm.mileage, 10) : undefined,
        notes: detailsForm.notes || undefined,
        year: detailsForm.year ? parseInt(detailsForm.year, 10) : undefined,
      });
      setEditModal(null);
    } catch {
      Alert.alert("Error", "Failed to save vehicle details.");
    } finally {
      setSaving(false);
    }
  }, [id, detailsForm, updateVehicle]);

  const handleSaveEngine = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const config: EngineConfig = {
        ...engineForm,
        type: engineForm.type || "Custom",
      };
      await updateVehicle(id, { engineConfig: config });
      setEditModal(null);
    } catch {
      Alert.alert("Error", "Failed to save engine configuration.");
    } finally {
      setSaving(false);
    }
  }, [id, engineForm, updateVehicle]);

  const handleAddRepair = useCallback(async () => {
    if (!id || !repairForm.title) return;
    setSaving(true);
    try {
      const existing = vehicle?.repairs || {};
      const key = `r_${Date.now()}`;
      const entry: RepairEntry = {
        date: Date.now(),
        type: repairForm.type ?? "maintenance",
        title: repairForm.title,
        description: repairForm.description,
        mileage: repairForm.mileage,
        cost: repairForm.cost,
        shop: repairForm.shop,
      };
      await updateVehicle(id, { repairs: { ...existing, [key]: entry } });
      setAddModal(null);
      setRepairForm({ type: "maintenance", title: "", description: "", shop: "" });
    } catch {
      Alert.alert("Error", "Failed to add service entry.");
    } finally {
      setSaving(false);
    }
  }, [id, repairForm, vehicle, updateVehicle]);

  const handleDeleteRepair = useCallback(async (key: string) => {
    if (!id) return;
    const existing = { ...(vehicle?.repairs || {}) };
    delete existing[key];
    await updateVehicle(id, { repairs: existing });
  }, [id, vehicle, updateVehicle]);

  const handleAddDamage = useCallback(async () => {
    if (!id || !damageForm.title) return;
    setSaving(true);
    try {
      const existing = vehicle?.damages || {};
      const key = `d_${Date.now()}`;
      const entry: DamageReport = {
        date: Date.now(),
        title: damageForm.title,
        description: damageForm.description,
        severity: damageForm.severity ?? "minor",
        repaired: damageForm.repaired ?? false,
      };
      await updateVehicle(id, { damages: { ...existing, [key]: entry } });
      setAddModal(null);
      setDamageForm({ title: "", description: "", severity: "minor", repaired: false });
    } catch {
      Alert.alert("Error", "Failed to add damage report.");
    } finally {
      setSaving(false);
    }
  }, [id, damageForm, vehicle, updateVehicle]);

  const handleDeleteDamage = useCallback(async (key: string) => {
    if (!id) return;
    const existing = { ...(vehicle?.damages || {}) };
    delete existing[key];
    await updateVehicle(id, { damages: existing });
  }, [id, vehicle, updateVehicle]);

  const handleAddBooking = useCallback(async () => {
    if (!id || !bookingForm.title) return;
    setSaving(true);
    try {
      const existing = vehicle?.bookings || {};
      const key = `b_${Date.now()}`;
      const entry: Booking = {
        date: Date.now(),
        type: bookingForm.type ?? "service",
        title: bookingForm.title,
        location: bookingForm.location,
        notes: bookingForm.notes,
        status: "pending",
      };
      await updateVehicle(id, { bookings: { ...existing, [key]: entry } });
      setAddModal(null);
      setBookingForm({ type: "service", title: "", location: "", notes: "", status: "pending" });
    } catch {
      Alert.alert("Error", "Failed to add reservation.");
    } finally {
      setSaving(false);
    }
  }, [id, bookingForm, vehicle, updateVehicle]);

  const handleDeleteBooking = useCallback(async (key: string) => {
    if (!id) return;
    const existing = { ...(vehicle?.bookings || {}) };
    delete existing[key];
    await updateVehicle(id, { bookings: existing });
  }, [id, vehicle, updateVehicle]);

  const handleRemoveVehicle = useCallback(() => {
    Alert.alert(
      "Remove Vehicle",
      `Remove ${vehicle?.nickname || vehicle?.model} from your garage?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            await removeVehicle(id);
            router.back();
          },
        },
      ]
    );
  }, [id, vehicle, removeVehicle]);

  const openManual = useCallback(() => {
    const url = vehicle?.manualUrl;
    if (!url) {
      Alert.alert("Manual", "Manual URL not available for this vehicle yet.");
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open manual."));
  }, [vehicle]);

  const openOBD = useCallback(() => {
    router.push({ pathname: "/garage/obd", params: { vehicleId: id, vehicleName: vehicle?.nickname || vehicle?.model } } as any);
  }, [id, vehicle]);

  if (!vehicle) {
    return (
      <View style={styles.notFound}>
        <Car size={48} color={theme.colors.textGray} strokeWidth={1} />
        <Text style={styles.notFoundText}>Vehicle not found</Text>
      </View>
    );
  }

  const repairs = vehicle.repairs ? Object.entries(vehicle.repairs) : [];
  const damages = vehicle.damages ? Object.entries(vehicle.damages) : [];
  const bookings = vehicle.bookings ? Object.entries(vehicle.bookings) : [];

  const displayName = vehicle.nickname || vehicle.model;

  return (
    <>
      <Stack.Screen options={{ title: displayName }} />
      <View style={styles.root}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
          <View style={styles.heroSection}>
            {vehicle.image ? (
              <Image source={{ uri: vehicle.image }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Car size={56} color={theme.colors.textGray} strokeWidth={1} />
              </View>
            )}
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroNickname}>{vehicle.nickname || vehicle.model}</Text>
              {vehicle.nickname && <Text style={styles.heroModel}>{vehicle.model}</Text>}
              <View style={styles.heroBadges}>
                {vehicle.color && <Text style={styles.heroBadge}>{vehicle.color}</Text>}
                {vehicle.package && <Text style={styles.heroBadge}>{vehicle.package}</Text>}
                {vehicle.year && <Text style={styles.heroBadge}>{vehicle.year}</Text>}
              </View>
            </View>
          </View>

          <View style={styles.stickyHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {SECTIONS.map((s) => (
                <SectionPill key={s.key} section={s} active={activeSection === s.key} onPress={() => setActiveSection(s.key)} />
              ))}
            </ScrollView>
          </View>

          {activeSection === "overview" && (
            <View style={styles.sectionBody}>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} onPress={openOBD} activeOpacity={0.8}>
                  <Activity size={18} color={theme.colors.white} strokeWidth={1.8} />
                  <Text style={styles.actionBtnText}>OBD Diagnostics</Text>
                  <ChevronRight size={16} color={theme.colors.textGray} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={openManual} activeOpacity={0.8}>
                  <BookOpen size={18} color={theme.colors.white} strokeWidth={1.8} />
                  <Text style={styles.actionBtnText}>Vehicle Manual</Text>
                  <ExternalLink size={16} color={theme.colors.textGray} />
                </TouchableOpacity>
              </View>

              {vehicle.specs && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Factory Specs</Text>
                  <View style={styles.specsGrid}>
                    {vehicle.specs.hp !== undefined && (
                      <View style={styles.specCell}>
                        <Zap size={16} color={theme.colors.textGray} strokeWidth={1.5} />
                        <Text style={styles.specCellValue}>{vehicle.engineConfig?.hp ?? vehicle.specs.hp} hp</Text>
                        <Text style={styles.specCellLabel}>Power</Text>
                      </View>
                    )}
                    {vehicle.specs.weight_lbs !== undefined && (
                      <View style={styles.specCell}>
                        <Weight size={16} color={theme.colors.textGray} strokeWidth={1.5} />
                        <Text style={styles.specCellValue}>{vehicle.specs.weight_lbs} lbs</Text>
                        <Text style={styles.specCellLabel}>Weight</Text>
                      </View>
                    )}
                    {vehicle.specs.engine && (
                      <View style={[styles.specCell, { flex: 1 }]}>
                        <Gauge size={16} color={theme.colors.textGray} strokeWidth={1.5} />
                        <Text style={styles.specCellValue}>{vehicle.specs.engine}</Text>
                        <Text style={styles.specCellLabel}>Engine Bay</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Details</Text>
                  <TouchableOpacity onPress={() => {
                    setDetailsForm({
                      nickname: vehicle.nickname ?? "",
                      vin: vehicle.vin ?? "",
                      mileage: vehicle.mileage?.toString() ?? "",
                      notes: vehicle.notes ?? "",
                      year: vehicle.year?.toString() ?? "",
                    });
                    setEditModal("details");
                  }}>
                    <Edit2 size={16} color={theme.colors.textGray} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRows}>
                  <DetailRow label="Nickname" value={vehicle.nickname} />
                  <DetailRow label="Year" value={vehicle.year?.toString()} />
                  <DetailRow label="VIN" value={vehicle.vin} mono />
                  <DetailRow label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : undefined} />
                  {vehicle.notes && (
                    <View style={styles.notesRow}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.notesText}>{vehicle.notes}</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.removeButton} onPress={handleRemoveVehicle} activeOpacity={0.7}>
                <Trash2 size={16} color={theme.colors.error} strokeWidth={1.8} />
                <Text style={styles.removeButtonText}>Remove Vehicle</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "engine" && (
            <View style={styles.sectionBody}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Engine Configuration</Text>
                  <TouchableOpacity onPress={() => {
                    setEngineForm({
                      type: vehicle.engineConfig?.type ?? "",
                      displacement: vehicle.engineConfig?.displacement ?? "",
                      hp: vehicle.engineConfig?.hp,
                      torque: vehicle.engineConfig?.torque,
                      tuner: vehicle.engineConfig?.tuner ?? "",
                      fuelType: vehicle.engineConfig?.fuelType ?? "",
                      notes: vehicle.engineConfig?.notes ?? "",
                    });
                    setEditModal("engine");
                  }}>
                    <Edit2 size={16} color={theme.colors.textGray} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>

                {vehicle.engineConfig ? (
                  <View style={styles.detailRows}>
                    <DetailRow label="Engine Type" value={vehicle.engineConfig.type} />
                    <DetailRow label="Displacement" value={vehicle.engineConfig.displacement} />
                    <DetailRow label="Power" value={vehicle.engineConfig.hp ? `${vehicle.engineConfig.hp} hp` : undefined} />
                    <DetailRow label="Torque" value={vehicle.engineConfig.torque ? `${vehicle.engineConfig.torque} ft-lb` : undefined} />
                    <DetailRow label="Tuner" value={vehicle.engineConfig.tuner} />
                    <DetailRow label="Fuel Type" value={vehicle.engineConfig.fuelType} />
                    {vehicle.engineConfig.notes && (
                      <View style={styles.notesRow}>
                        <Text style={styles.detailLabel}>Notes</Text>
                        <Text style={styles.notesText}>{vehicle.engineConfig.notes}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptySection}>
                    <Zap size={32} color={theme.colors.textGray} strokeWidth={1} />
                    <Text style={styles.emptySectionText}>No engine configured</Text>
                    <Text style={styles.emptySectionSub}>
                      The F300 is sold without an engine.{"\n"}Recommended: GTR250R
                    </Text>
                    <TouchableOpacity
                      style={styles.addInlineBtn}
                      onPress={() => setEditModal("engine")}
                    >
                      <Text style={styles.addInlineBtnText}>Configure Engine</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Recommended Engine</Text>
                <Text style={styles.infoCardBody}>
                  The Reycin F300 is designed around the GTR250R powerplant. It delivers exceptional power-to-weight ratio and is fully supported by the Reycin tuning ecosystem.
                </Text>
              </View>
            </View>
          )}

          {activeSection === "service" && (
            <View style={styles.sectionBody}>
              {repairs.length === 0 ? (
                <View style={styles.emptySection}>
                  <Wrench size={40} color={theme.colors.textGray} strokeWidth={1} />
                  <Text style={styles.emptySectionText}>No service entries</Text>
                  <Text style={styles.emptySectionSub}>Log repairs, upgrades, and maintenance</Text>
                </View>
              ) : (
                <View style={styles.entryList}>
                  {repairs.map(([key, entry]: [string, RepairEntry]) => (
                    <View key={key} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <View style={[styles.typeTag, styles[`typeTag_${entry.type}`]]}>
                          <Text style={styles.typeTagText}>{entry.type}</Text>
                        </View>
                        <Text style={styles.entryDate}>{new Date(entry.date).toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => handleDeleteRepair(key)} style={styles.deleteBtn}>
                          <Trash2 size={14} color={theme.colors.textGray} strokeWidth={1.8} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entry.description && <Text style={styles.entryDesc}>{entry.description}</Text>}
                      <View style={styles.entryMeta}>
                        {entry.shop && <Text style={styles.entryMetaText}>@ {entry.shop}</Text>}
                        {entry.mileage !== undefined && <Text style={styles.entryMetaText}>{entry.mileage.toLocaleString()} mi</Text>}
                        {entry.cost !== undefined && <Text style={styles.entryMetaText}>${entry.cost.toLocaleString()}</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.addButton} onPress={() => setAddModal("repair")} activeOpacity={0.8}>
                <Plus size={18} color={theme.colors.black} strokeWidth={2} />
                <Text style={styles.addButtonText}>Add Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "damage" && (
            <View style={styles.sectionBody}>
              {damages.length === 0 ? (
                <View style={styles.emptySection}>
                  <AlertTriangle size={40} color={theme.colors.textGray} strokeWidth={1} />
                  <Text style={styles.emptySectionText}>No damage reports</Text>
                  <Text style={styles.emptySectionSub}>Document any damage incidents</Text>
                </View>
              ) : (
                <View style={styles.entryList}>
                  {damages.map(([key, entry]: [string, DamageReport]) => (
                    <View key={key} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <View style={[styles.severityTag, styles[`severity_${entry.severity}`]]}>
                          <Text style={styles.typeTagText}>{entry.severity}</Text>
                        </View>
                        {entry.repaired && (
                          <View style={styles.repairedTag}>
                            <Text style={styles.repairedTagText}>Repaired</Text>
                          </View>
                        )}
                        <Text style={[styles.entryDate, { flex: 1, textAlign: "right" }]}>{new Date(entry.date).toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => handleDeleteDamage(key)} style={styles.deleteBtn}>
                          <Trash2 size={14} color={theme.colors.textGray} strokeWidth={1.8} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entry.description && <Text style={styles.entryDesc}>{entry.description}</Text>}
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.addButton} onPress={() => setAddModal("damage")} activeOpacity={0.8}>
                <Plus size={18} color={theme.colors.black} strokeWidth={2} />
                <Text style={styles.addButtonText}>Add Report</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "bookings" && (
            <View style={styles.sectionBody}>
              {bookings.length === 0 ? (
                <View style={styles.emptySection}>
                  <Calendar size={40} color={theme.colors.textGray} strokeWidth={1} />
                  <Text style={styles.emptySectionText}>No reservations</Text>
                  <Text style={styles.emptySectionSub}>Book service appointments or track days</Text>
                </View>
              ) : (
                <View style={styles.entryList}>
                  {bookings.map(([key, entry]: [string, Booking]) => (
                    <View key={key} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <View style={[styles.typeTag, entry.type === "track" ? styles.typeTag_upgrade : styles.typeTag_maintenance]}>
                          <Text style={styles.typeTagText}>{entry.type}</Text>
                        </View>
                        <View style={[styles.statusTag, styles[`status_${entry.status}`]]}>
                          <Text style={styles.statusTagText}>{entry.status}</Text>
                        </View>
                        <Text style={[styles.entryDate, { flex: 1, textAlign: "right" }]}>{new Date(entry.date).toLocaleDateString()}</Text>
                        <TouchableOpacity onPress={() => handleDeleteBooking(key)} style={styles.deleteBtn}>
                          <Trash2 size={14} color={theme.colors.textGray} strokeWidth={1.8} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entry.location && <Text style={styles.entryDesc}>📍 {entry.location}</Text>}
                      {entry.notes && <Text style={styles.entryDesc}>{entry.notes}</Text>}
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.addButton} onPress={() => setAddModal("booking")} activeOpacity={0.8}>
                <Plus size={18} color={theme.colors.black} strokeWidth={2} />
                <Text style={styles.addButtonText}>New Reservation</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal visible={editModal === "details"} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Details</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <FormField label="Nickname" value={detailsForm.nickname} onChangeText={(v) => setDetailsForm(f => ({ ...f, nickname: v }))} placeholder="e.g. Black Betty" />
              <FormField label="Year" value={detailsForm.year} onChangeText={(v) => setDetailsForm(f => ({ ...f, year: v }))} placeholder="e.g. 2024" keyboardType="numeric" />
              <FormField label="VIN" value={detailsForm.vin} onChangeText={(v) => setDetailsForm(f => ({ ...f, vin: v }))} placeholder="Vehicle Identification Number" mono />
              <FormField label="Mileage" value={detailsForm.mileage} onChangeText={(v) => setDetailsForm(f => ({ ...f, mileage: v }))} placeholder="Miles" keyboardType="numeric" />
              <FormField label="Notes" value={detailsForm.notes} onChangeText={(v) => setDetailsForm(f => ({ ...f, notes: v }))} placeholder="Any notes..." multiline />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveDetails} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={editModal === "engine"} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Engine Configuration</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalHint}>Sold without engine. Recommended: GTR250R</Text>
              <FormField label="Engine Type" value={engineForm.type} onChangeText={(v) => setEngineForm(f => ({ ...f, type: v }))} placeholder="e.g. GTR250R, Honda CB, etc." />
              <FormField label="Displacement" value={engineForm.displacement ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, displacement: v }))} placeholder="e.g. 249cc" />
              <FormField label="Horsepower" value={engineForm.hp?.toString() ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, hp: v ? parseInt(v, 10) : undefined }))} placeholder="hp" keyboardType="numeric" />
              <FormField label="Torque (ft-lb)" value={engineForm.torque?.toString() ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, torque: v ? parseInt(v, 10) : undefined }))} placeholder="ft-lb" keyboardType="numeric" />
              <FormField label="Tuner / Builder" value={engineForm.tuner ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, tuner: v }))} placeholder="Who built or tuned it" />
              <FormField label="Fuel Type" value={engineForm.fuelType ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, fuelType: v }))} placeholder="e.g. Premium, E85" />
              <FormField label="Notes" value={engineForm.notes ?? ""} onChangeText={(v) => setEngineForm(f => ({ ...f, notes: v }))} placeholder="Mods, tuning notes..." multiline />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveEngine} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={addModal === "repair"} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Service Entry</Text>
              <TouchableOpacity onPress={() => setAddModal(null)}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.toggleRow}>
                {(["maintenance", "repair", "upgrade"] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.toggle, repairForm.type === t && styles.toggleActive]} onPress={() => setRepairForm(f => ({ ...f, type: t }))}>
                    <Text style={[styles.toggleText, repairForm.type === t && styles.toggleTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <FormField label="Title *" value={repairForm.title ?? ""} onChangeText={(v) => setRepairForm(f => ({ ...f, title: v }))} placeholder="e.g. Oil Change, New Exhaust" />
              <FormField label="Description" value={repairForm.description ?? ""} onChangeText={(v) => setRepairForm(f => ({ ...f, description: v }))} placeholder="Details..." multiline />
              <FormField label="Shop / Technician" value={repairForm.shop ?? ""} onChangeText={(v) => setRepairForm(f => ({ ...f, shop: v }))} placeholder="Who did the work" />
              <FormField label="Mileage" value={repairForm.mileage?.toString() ?? ""} onChangeText={(v) => setRepairForm(f => ({ ...f, mileage: v ? parseInt(v, 10) : undefined }))} placeholder="Miles at service" keyboardType="numeric" />
              <FormField label="Cost ($)" value={repairForm.cost?.toString() ?? ""} onChangeText={(v) => setRepairForm(f => ({ ...f, cost: v ? parseInt(v, 10) : undefined }))} placeholder="0" keyboardType="numeric" />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, (!repairForm.title || saving) && styles.saveBtnDisabled]} onPress={handleAddRepair} disabled={!repairForm.title || saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Add Entry"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={addModal === "damage"} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Damage Report</Text>
              <TouchableOpacity onPress={() => setAddModal(null)}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <FormField label="Title *" value={damageForm.title ?? ""} onChangeText={(v) => setDamageForm(f => ({ ...f, title: v }))} placeholder="e.g. Front bumper crack" />
              <FormField label="Description" value={damageForm.description ?? ""} onChangeText={(v) => setDamageForm(f => ({ ...f, description: v }))} placeholder="Details..." multiline />
              <Text style={styles.fieldLabel}>Severity</Text>
              <View style={styles.toggleRow}>
                {(["minor", "moderate", "severe"] as const).map((s) => (
                  <TouchableOpacity key={s} style={[styles.toggle, damageForm.severity === s && styles.toggleActive]} onPress={() => setDamageForm(f => ({ ...f, severity: s }))}>
                    <Text style={[styles.toggleText, damageForm.severity === s && styles.toggleTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggle, !damageForm.repaired && styles.toggleActive]} onPress={() => setDamageForm(f => ({ ...f, repaired: false }))}>
                  <Text style={[styles.toggleText, !damageForm.repaired && styles.toggleTextActive]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggle, damageForm.repaired && styles.toggleActive]} onPress={() => setDamageForm(f => ({ ...f, repaired: true }))}>
                  <Text style={[styles.toggleText, damageForm.repaired && styles.toggleTextActive]}>Repaired</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, (!damageForm.title || saving) && styles.saveBtnDisabled]} onPress={handleAddDamage} disabled={!damageForm.title || saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Add Report"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={addModal === "booking"} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reservation</Text>
              <TouchableOpacity onPress={() => setAddModal(null)}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggle, bookingForm.type === "service" && styles.toggleActive]} onPress={() => setBookingForm(f => ({ ...f, type: "service" }))}>
                  <Text style={[styles.toggleText, bookingForm.type === "service" && styles.toggleTextActive]}>Service</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggle, bookingForm.type === "track" && styles.toggleActive]} onPress={() => setBookingForm(f => ({ ...f, type: "track" }))}>
                  <Text style={[styles.toggleText, bookingForm.type === "track" && styles.toggleTextActive]}>Track Day</Text>
                </TouchableOpacity>
              </View>
              <FormField label="Title *" value={bookingForm.title ?? ""} onChangeText={(v) => setBookingForm(f => ({ ...f, title: v }))} placeholder="e.g. Annual Service, Track Day - COTA" />
              <FormField label="Location" value={bookingForm.location ?? ""} onChangeText={(v) => setBookingForm(f => ({ ...f, location: v }))} placeholder="Facility or address" />
              <FormField label="Notes" value={bookingForm.notes ?? ""} onChangeText={(v) => setBookingForm(f => ({ ...f, notes: v }))} placeholder="Any notes..." multiline />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveBtn, (!bookingForm.title || saving) && styles.saveBtnDisabled]} onPress={handleAddBooking} disabled={!bookingForm.title || saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Book"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailValueMono]}>{value}</Text>
    </View>
  );
}

function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, mono,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  mono?: boolean;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti, mono && styles.fieldInputMono]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textGray}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.black,
    gap: 12,
  },
  notFoundText: {
    color: theme.colors.textGray,
    fontSize: 16,
  },
  heroSection: {
    height: 240,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.darkGray,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroNickname: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  heroModel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  heroBadge: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  stickyHeader: {
    backgroundColor: theme.colors.black,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
    paddingVertical: 12,
  },
  pillsRow: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  pillActive: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textGray,
  },
  pillTextActive: {
    color: theme.colors.black,
  },
  sectionBody: {
    padding: 16,
    gap: 12,
  },
  actionButtons: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.white,
  },
  card: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  specsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  specCell: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    alignItems: "center",
    gap: 4,
    minWidth: 70,
  },
  specCellValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.white,
  },
  specCellLabel: {
    fontSize: 10,
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRows: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textGray,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.white,
    flex: 2,
    textAlign: "right",
  },
  detailValueMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
  },
  notesRow: {
    gap: 6,
    paddingTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.white,
    lineHeight: 20,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptySectionText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: 8,
  },
  emptySectionSub: {
    fontSize: 13,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 20,
  },
  addInlineBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
  },
  addInlineBtnText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoCardBody: {
    fontSize: 13,
    color: theme.colors.textGray,
    lineHeight: 20,
  },
  entryList: {
    gap: 10,
  },
  entryCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 14,
    gap: 6,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTag_maintenance: {
    backgroundColor: "rgba(52,199,89,0.15)",
  },
  typeTag_repair: {
    backgroundColor: "rgba(255,149,0,0.15)",
  },
  typeTag_upgrade: {
    backgroundColor: "rgba(10,132,255,0.15)",
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.white,
    textTransform: "capitalize",
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severity_minor: {
    backgroundColor: "rgba(52,199,89,0.15)",
  },
  severity_moderate: {
    backgroundColor: "rgba(255,149,0,0.15)",
  },
  severity_severe: {
    backgroundColor: "rgba(255,59,48,0.15)",
  },
  repairedTag: {
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  repairedTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.success,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  status_pending: {
    backgroundColor: "rgba(255,149,0,0.15)",
  },
  status_confirmed: {
    backgroundColor: "rgba(10,132,255,0.15)",
  },
  status_completed: {
    backgroundColor: "rgba(52,199,89,0.15)",
  },
  status_cancelled: {
    backgroundColor: "rgba(255,59,48,0.15)",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.white,
    textTransform: "capitalize",
  },
  entryDate: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  deleteBtn: {
    padding: 4,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.white,
  },
  entryDesc: {
    fontSize: 13,
    color: theme.colors.textGray,
    lineHeight: 18,
  },
  entryMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  entryMetaText: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: 4,
  },
  addButtonText: {
    color: theme.colors.black,
    fontSize: 15,
    fontWeight: "600",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.3)",
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: 8,
  },
  removeButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: "500",
  },
  modal: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.white,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalHint: {
    fontSize: 13,
    color: theme.colors.textGray,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGray,
  },
  formField: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: theme.colors.white,
  },
  fieldInputMulti: {
    height: 100,
    textAlignVertical: "top",
  },
  fieldInputMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  saveBtn: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  toggleActive: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textGray,
    textTransform: "capitalize",
  },
  toggleTextActive: {
    color: theme.colors.black,
  },
});
