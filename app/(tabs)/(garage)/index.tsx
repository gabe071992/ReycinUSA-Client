import React, { useState } from "react";
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
} from "react-native";
import { theme } from "@/constants/theme";
import { Plus, Car, Calendar, Wrench, X } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { getDatabase, ref, push, set } from "firebase/database";
import { app } from "@/config/firebase";

interface VehicleFormData {
  model: string;
  vin: string;
  year: string;
  color: string;
  purchaseDate: string;
}

interface ServiceBookingData {
  vehicleId: string;
  serviceType: string;
  dateISO: string;
  timeSlot: string;
  location: string;
  notes: string;
}

export default function GarageScreen() {
  const { profile, user } = useAuth();
  const vehicles = profile?.vehicles || {};
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showBookServiceModal, setShowBookServiceModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>({
    model: '',
    vin: '',
    year: '',
    color: '',
    purchaseDate: '',
  });
  const [serviceForm, setServiceForm] = useState<ServiceBookingData>({
    vehicleId: '',
    serviceType: '',
    dateISO: '',
    timeSlot: '',
    location: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {Object.keys(vehicles).length === 0 ? (
        <View style={styles.emptyState}>
          <Car size={64} color={theme.colors.textGray} strokeWidth={1} />
          <Text style={styles.emptyTitle}>No Vehicles Yet</Text>
          <Text style={styles.emptyDescription}>
            Add your Reycin vehicle to access diagnostics, service history, and more
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddVehicleModal(true)}
          >
            <Plus size={20} color={theme.colors.black} />
            <Text style={styles.addButtonText}>ADD VEHICLE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {Object.entries(vehicles).map(([id, vehicle]: [string, any]) => (
            <TouchableOpacity
              key={id}
              style={styles.vehicleCard}
              onPress={() => {}}
            >
              <Image
                source={{ uri: vehicle.photo || "https://ReycinTuner.b-cdn.net/C3725DEC-FF03-474B-AC24-868F9C9392BD.png" }}
                style={styles.vehicleImage}
              />
              <View style={styles.vehicleContent}>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                <Text style={styles.vehicleVin}>VIN: {vehicle.vin}</Text>
                <Text style={styles.vehicleYear}>Year: {vehicle.year}</Text>
                
                <View style={styles.vehicleActions}>
                  <TouchableOpacity style={styles.vehicleAction}>
                    <Wrench size={16} color={theme.colors.white} />
                    <Text style={styles.vehicleActionText}>Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vehicleAction}>
                    <Calendar size={16} color={theme.colors.white} />
                    <Text style={styles.vehicleActionText}>History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowBookServiceModal(true)}
        >
          <View style={styles.actionIcon}>
            <Calendar size={24} color={theme.colors.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Book Service</Text>
            <Text style={styles.actionDescription}>Schedule maintenance or track support</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Wrench size={24} color={theme.colors.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Maintenance Schedule</Text>
            <Text style={styles.actionDescription}>View recommended service intervals</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddVehicleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <TouchableOpacity 
              onPress={() => setShowAddVehicleModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Model *</Text>
              <TextInput
                style={styles.formInput}
                value={vehicleForm.model}
                onChangeText={(text) => setVehicleForm({...vehicleForm, model: text})}
                placeholder="F300, 900, 900R"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>VIN *</Text>
              <TextInput
                style={styles.formInput}
                value={vehicleForm.vin}
                onChangeText={(text) => setVehicleForm({...vehicleForm, vin: text})}
                placeholder="Vehicle Identification Number"
                placeholderTextColor={theme.colors.textGray}
                autoCapitalize="characters"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Year *</Text>
              <TextInput
                style={styles.formInput}
                value={vehicleForm.year}
                onChangeText={(text) => setVehicleForm({...vehicleForm, year: text})}
                placeholder="2024"
                placeholderTextColor={theme.colors.textGray}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <TextInput
                style={styles.formInput}
                value={vehicleForm.color}
                onChangeText={(text) => setVehicleForm({...vehicleForm, color: text})}
                placeholder="Vehicle color"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Purchase Date</Text>
              <TextInput
                style={styles.formInput}
                value={vehicleForm.purchaseDate}
                onChangeText={(text) => setVehicleForm({...vehicleForm, purchaseDate: text})}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleAddVehicle}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Vehicle'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Book Service Modal */}
      <Modal
        visible={showBookServiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Service</Text>
            <TouchableOpacity 
              onPress={() => setShowBookServiceModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Vehicle *</Text>
              <TextInput
                style={styles.formInput}
                value={serviceForm.vehicleId}
                onChangeText={(text) => setServiceForm({...serviceForm, vehicleId: text})}
                placeholder="Select or enter vehicle ID"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Type *</Text>
              <TextInput
                style={styles.formInput}
                value={serviceForm.serviceType}
                onChangeText={(text) => setServiceForm({...serviceForm, serviceType: text})}
                placeholder="Maintenance, Repair, Inspection"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TextInput
                style={styles.formInput}
                value={serviceForm.dateISO}
                onChangeText={(text) => setServiceForm({...serviceForm, dateISO: text})}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Time Slot *</Text>
              <TextInput
                style={styles.formInput}
                value={serviceForm.timeSlot}
                onChangeText={(text) => setServiceForm({...serviceForm, timeSlot: text})}
                placeholder="HH:MM (e.g., 09:00)"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location *</Text>
              <TextInput
                style={styles.formInput}
                value={serviceForm.location}
                onChangeText={(text) => setServiceForm({...serviceForm, location: text})}
                placeholder="Service center location"
                placeholderTextColor={theme.colors.textGray}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={serviceForm.notes}
                onChangeText={(text) => setServiceForm({...serviceForm, notes: text})}
                placeholder="Additional notes or special requests"
                placeholderTextColor={theme.colors.textGray}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleBookService}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Booking...' : 'Book Service'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );

  async function handleAddVehicle() {
    if (!vehicleForm.model || !vehicleForm.vin || !vehicleForm.year) {
      Alert.alert('Error', 'Please fill in all required fields (Model, VIN, Year)');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a vehicle');
      return;
    }

    setLoading(true);
    try {
      const database = getDatabase(app);
      const vehicleRef = ref(database, `reycinUSA/users/${user.uid}/vehicles`);
      const newVehicleRef = push(vehicleRef);
      
      const vehicleData = {
        model: vehicleForm.model,
        vin: vehicleForm.vin,
        year: parseInt(vehicleForm.year),
        color: vehicleForm.color || '',
        purchaseDate: vehicleForm.purchaseDate ? new Date(vehicleForm.purchaseDate).getTime() : Date.now(),
        warrantyExpiry: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
        photo: "https://ReycinTuner.b-cdn.net/C3725DEC-FF03-474B-AC24-868F9C9392BD.png",
      };
      
      await set(newVehicleRef, vehicleData);
      
      Alert.alert('Success', 'Vehicle added successfully!');
      setShowAddVehicleModal(false);
      setVehicleForm({
        model: '',
        vin: '',
        year: '',
        color: '',
        purchaseDate: '',
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBookService() {
    if (!serviceForm.vehicleId || !serviceForm.serviceType || !serviceForm.dateISO || !serviceForm.timeSlot || !serviceForm.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to book a service');
      return;
    }

    setLoading(true);
    try {
      const database = getDatabase(app);
      const bookingRef = ref(database, 'reycinUSA/serviceBookings');
      const newBookingRef = push(bookingRef);
      
      const bookingData = {
        uid: user.uid,
        vehicleId: serviceForm.vehicleId,
        serviceId: serviceForm.serviceType,
        dateISO: serviceForm.dateISO,
        timeSlot: serviceForm.timeSlot,
        status: 'requested',
        location: serviceForm.location,
        notes: serviceForm.notes,
        estimatedCost: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await set(newBookingRef, bookingData);
      
      Alert.alert('Success', 'Service booking requested successfully!');
      setShowBookServiceModal(false);
      setServiceForm({
        vehicleId: '',
        serviceType: '',
        dateISO: '',
        timeSlot: '',
        location: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error booking service:', error);
      Alert.alert('Error', 'Failed to book service. Please try again.');
    } finally {
      setLoading(false);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  addButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  vehicleCard: {
    backgroundColor: theme.colors.darkGray,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  vehicleImage: {
    width: "100%",
    height: 200,
  },
  vehicleContent: {
    padding: theme.spacing.lg,
  },
  vehicleModel: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 8,
  },
  vehicleVin: {
    fontSize: 14,
    color: theme.colors.textGray,
    marginBottom: 4,
  },
  vehicleYear: {
    fontSize: 14,
    color: theme.colors.textGray,
    marginBottom: theme.spacing.md,
  },
  vehicleActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  vehicleAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  vehicleActionText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "500",
  },
  quickActions: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.white,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  formInput: {
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
});