import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme for consistent styling
const theme = {
  primaryGreen: '#4CAF50',
  darkGreen: '#2E7D32',
  lightGray: '#18181b', // Background for cards/sections
  mediumGray: '#23232a', // Borders and input backgrounds
  white: '#FFFFFF',
  gray: '#9E9E9E', // Secondary text
  darkGray: '#616161',
  black: '#000000', // Main background
  red: '#f87171', // Error messages
};

const DEFAULT_PROFILE_IMAGE = 'https://placehold.co/100x100/EFEFEF/333?text=F';

// Reusable component for displaying static profile fields
const ProfileField = ({ label, value }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value || '-'}</Text>
  </View>
);

// Reusable component for editable input fields within modals
const EditableField = ({ label, value, onChangeText, keyboardType = 'default', multiline = false, ...props }) => (
  <View style={styles.editableFieldContainer}>
    <Text style={styles.editableFieldLabel}>{label}</Text>
    <TextInput
      style={[styles.editableFieldInput, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={`Enter ${label.toLowerCase()}`}
      placeholderTextColor={theme.gray}
      keyboardType={keyboardType}
      multiline={multiline}
      {...props}
    />
  </View>
);

// Reusable section header with an optional edit button
const Section = ({ title, children, onEdit, onAdd }) => (
  <View style={styles.sectionOuter}>
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionHeaderActions}>
        {onAdd && (
          <TouchableOpacity onPress={onAdd} style={styles.sectionActionButton}>
            <Ionicons name="add-circle-outline" size={24} color={theme.primaryGreen} />
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.sectionActionButton}>
            <Ionicons name="create-outline" size={22} color={theme.primaryGreen} />
          </TouchableOpacity>
        )}
      </View>
    </View>
    <View style={styles.section}>{children}</View>
  </View>
);

// Custom Button component for consistency
const CustomButton = ({ title, onPress, color, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.customButton, { backgroundColor: color || theme.primaryGreen }, disabled && styles.disabledButton]}
    disabled={disabled}
  >
    {disabled ? (
      <ActivityIndicator size="small" color={theme.white} />
    ) : (
      <Text style={styles.customButtonText}>{title}</Text>
    )}
  </TouchableOpacity>
);

const FarmerProfileScreen = ({ route, navigation }) => {
  const { farmerId } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [crops, setCrops] = useState([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);

  const [livestock, setLivestock] = useState([]);
  const [livestockLoading, setLivestockLoading] = useState(true);
  const [livestockError, setLivestockError] = useState(null);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  const insets = useSafeAreaInsets();
  const API_BASE = 'http://192.168.0.111:8000'; // Make sure this IP is accessible from your device

  const PROFILE_CACHE_KEY = `farmer-profile-cache-${farmerId}`;

  // State for Modals
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [currentCrop, setCurrentCrop] = useState(null); // Used for both editing and adding
  const [cropLoading, setCropLoading] = useState(false);

  const [livestockModalVisible, setLivestockModalVisible] = useState(false);
  const [currentLivestock, setCurrentLivestock] = useState(null);
  const [livestockLoadingState, setLivestockLoadingState] = useState(false); // Renamed to avoid conflict

  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventLoadingState, setEventLoadingState] = useState(false); // Renamed to avoid conflict

  // --- Data Fetching Functions ---
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/farmer/${farmerId}/profile`);
      setProfile(res.data);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrops = async () => {
    setCropsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/farmer/${farmerId}/crops`);
      setCrops(res.data);
    } catch (err) {
      console.error('Failed to fetch crops:', err);
      setCropsError('Failed to load crops. Please try again.');
    } finally {
      setCropsLoading(false);
    }
  };

  const fetchLivestock = async () => {
    setLivestockLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/farmer/${farmerId}/livestock`);
      setLivestock(res.data);
    } catch (err) {
      console.error('Failed to fetch livestock:', err);
      setLivestockError('Failed to load livestock. Please try again.');
    } finally {
      setLivestockLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/farmer/${farmerId}/calendar`);
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEventsError('Failed to load events. Please try again.');
    } finally {
      setEventsLoading(false);
    }
  };

  // --- Effects to load data on component mount ---
  useEffect(() => {
    let isMounted = true;
    const loadProfileFromCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached && isMounted) {
          setProfile(JSON.parse(cached));
          setIsCacheLoaded(true);
          setLoading(false); // Show cached instantly
        }
      } catch (e) {}
      // Always fetch fresh in background
      fetchProfile();
    };
    loadProfileFromCache();
    fetchCrops();
    fetchLivestock();
    fetchEvents();
    return () => { isMounted = false; };
  }, [farmerId]);

  // --- Edit/Add Handlers ---

  // Profile Edit
  const handleOpenEditProfile = () => {
    setEditProfileData({ ...profile });
    setEditProfileVisible(true); // Open instantly, do not wait for any fetch
  };

  const handleSubmitEditProfile = async () => {
    setEditProfileLoading(true);
    try {
      // Optimistically update UI
      setProfile(editProfileData);
      await axios.put(`${API_BASE}/farmer/${farmerId}`, { ...editProfileData });
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(editProfileData));
      setEditProfileVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      setProfile(profile); // Rollback if error
      console.error('Profile update error:', e);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Crop Handlers (Add & Edit)
  const handleOpenCropModal = (crop = null) => {
    setCurrentCrop(crop || { name: '', plantingDate: '', totalDuration: '' }); // Initialize for add
    setCropModalVisible(true);
  };

  const handleSubmitCrop = async () => {
    setCropLoading(true);
    try {
      if (currentCrop && currentCrop.cropId) {
        // Edit existing crop
        await axios.put(`${API_BASE}/farmer/${farmerId}/crops/${currentCrop.cropId}`, currentCrop);
        setCrops(crops.map((c) => (c.cropId === currentCrop.cropId ? currentCrop : c)));
        Alert.alert('Success', 'Crop updated successfully!');
      } else {
        // Add new crop
        const res = await axios.post(`${API_BASE}/farmer/${farmerId}/crops`, currentCrop);
        setCrops([...crops, res.data]); // Assuming API returns the new crop with an ID
        Alert.alert('Success', 'Crop added successfully!');
      }
      setCropModalVisible(false);
    } catch (e) {
      console.error('Crop operation error:', e);
      Alert.alert('Error', `Failed to ${currentCrop && currentCrop.cropId ? 'update' : 'add'} crop. Please try again.`);
    } finally {
      setCropLoading(false);
    }
  };

  const handleDeleteCrop = async (cropId) => {
    Alert.alert(
      'Delete Crop',
      'Are you sure you want to delete this crop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/farmer/${farmerId}/crops/${cropId}`);
              setCrops(crops.filter((c) => c.cropId !== cropId));
              Alert.alert('Success', 'Crop deleted successfully!');
              setCropModalVisible(false); // Close modal if deleting the currently edited item
            } catch (e) {
              console.error('Crop delete error:', e);
              Alert.alert('Error', 'Failed to delete crop. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Livestock Handlers (Add & Edit)
  const handleOpenLivestockModal = (animal = null) => {
    setCurrentLivestock(animal || { name: '', type: '', breed: '', age: '', health: '' });
    setLivestockModalVisible(true);
  };

  const handleSubmitLivestock = async () => {
    setLivestockLoadingState(true);
    try {
      if (currentLivestock && currentLivestock.id) {
        // Edit existing livestock
        await axios.put(`${API_BASE}/farmer/${farmerId}/livestock/${currentLivestock.id}`, currentLivestock);
        setLivestock(livestock.map((a) => (a.id === currentLivestock.id ? currentLivestock : a)));
        Alert.alert('Success', 'Livestock updated successfully!');
      } else {
        // Add new livestock
        const res = await axios.post(`${API_BASE}/farmer/${farmerId}/livestock`, currentLivestock);
        setLivestock([...livestock, res.data]); // Assuming API returns the new livestock with an ID
        Alert.alert('Success', 'Livestock added successfully!');
      }
      setLivestockModalVisible(false);
    } catch (e) {
      console.error('Livestock operation error:', e);
      Alert.alert('Error', `Failed to ${currentLivestock && currentLivestock.id ? 'update' : 'add'} livestock. Please try again.`);
    } finally {
      setLivestockLoadingState(false);
    }
  };

  const handleDeleteLivestock = async (livestockId) => {
    Alert.alert(
      'Delete Livestock',
      'Are you sure you want to delete this livestock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/farmer/${farmerId}/livestock/${livestockId}`);
              setLivestock(livestock.filter((a) => a.id !== livestockId));
              Alert.alert('Success', 'Livestock deleted successfully!');
              setLivestockModalVisible(false);
            } catch (e) {
              console.error('Livestock delete error:', e);
              Alert.alert('Error', 'Failed to delete livestock. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Event Handlers (Add & Edit)
  const handleOpenEventModal = (event = null) => {
    setCurrentEvent(event || { task: '', date: '', time: '', type: '', priority: '', details: '' });
    setEventModalVisible(true);
  };

  const handleSubmitEvent = async () => {
    setEventLoadingState(true);
    try {
      if (currentEvent && currentEvent.task) {
        // Edit existing event - assuming 'task' is unique or acts as an ID
        await axios.put(`${API_BASE}/farmer/${farmerId}/calendar/${currentEvent.task}`, currentEvent);
        setEvents(events.map((e) => (e.task === currentEvent.task ? currentEvent : e)));
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        // Add new event
        const res = await axios.post(`${API_BASE}/farmer/${farmerId}/calendar`, currentEvent);
        setEvents([...events, res.data]); // Assuming API returns new event data
        Alert.alert('Success', 'Event added successfully!');
      }
      setEventModalVisible(false);
    } catch (e) {
      console.error('Event operation error:', e);
      Alert.alert('Error', `Failed to ${currentEvent && currentEvent.task ? 'update' : 'add'} event. Please try again.`);
    } finally {
      setEventLoadingState(false);
    }
  };

  const handleDeleteEvent = async (eventTask) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/farmer/${farmerId}/calendar/${eventTask}`);
              setEvents(events.filter((e) => e.task !== eventTask));
              Alert.alert('Success', 'Event deleted successfully!');
              setEventModalVisible(false);
            } catch (e) {
              console.error('Event delete error:', e);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // --- Loading and Error States ---
  if (loading && !isCacheLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.black }]}>
        <ActivityIndicator size="large" color={theme.primaryGreen} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.black }]}>
        <Text style={styles.errorText}>{error}</Text>
        <CustomButton title="Retry" onPress={fetchProfile} color={theme.primaryGreen} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.black }]}>
        <Text style={{ color: theme.white, fontSize: 16 }}>No profile data found.</Text>
        <CustomButton title="Go Back" onPress={() => navigation.goBack()} color={theme.primaryGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farmer Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: profile.profileImage || DEFAULT_PROFILE_IMAGE }}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.village}>{profile.village}</Text>
        </View>

        {/* Profile Info Section */}
        <Section title="Profile Information" onEdit={handleOpenEditProfile}>
          <ProfileField label="Phone Number" value={profile.phoneNumber} />
          <ProfileField label="Language" value={profile.language} />
          <ProfileField label="Farm Size" value={profile.farmSize} />
          <ProfileField label="Preferred Mode" value={profile.preferredInteractionMode} />
          <ProfileField label="Onboarding Status" value={profile.onboardingStatus} />
          <ProfileField label="Farmer ID" value={profile.farmerId} />
          <ProfileField label="Farm Location" value={profile.farmLocation ? `${profile.farmLocation.lat}, ${profile.farmLocation.lng}` : '-'} />
        </Section>

        {/* Crops Section */}
        <Section title="Crops" onAdd={() => handleOpenCropModal()}>
          {cropsLoading ? (
            <ActivityIndicator color={theme.primaryGreen} />
          ) : cropsError ? (
            <Text style={styles.errorText}>{cropsError}</Text>
          ) : crops.length === 0 ? (
            <Text style={styles.emptyStateText}>No crops added yet.</Text>
          ) : (
            crops.map((crop) => (
              <TouchableOpacity key={crop.cropId || crop.name} style={styles.itemRow} onPress={() => handleOpenCropModal(crop)}>
                <View>
                  <Text style={styles.itemTitle}>{crop.name}</Text>
                  <Text style={styles.itemSub}>Planting Date: {crop.plantingDate}</Text>
                  <Text style={styles.itemSub}>Duration: {crop.totalDuration}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={theme.gray} />
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Livestock Section */}
        <Section title="Livestock" onAdd={() => handleOpenLivestockModal()}>
          {livestockLoading ? (
            <ActivityIndicator color={theme.primaryGreen} />
          ) : livestockError ? (
            <Text style={styles.errorText}>{livestockError}</Text>
          ) : livestock.length === 0 ? (
            <Text style={styles.emptyStateText}>No livestock added yet.</Text>
          ) : (
            livestock.map((animal) => (
              <TouchableOpacity key={animal.id || animal.name} style={styles.itemRow} onPress={() => handleOpenLivestockModal(animal)}>
                <View>
                  <Text style={styles.itemTitle}>{animal.name} <Text style={styles.itemType}>({animal.type})</Text></Text>
                  <Text style={styles.itemSub}>Breed: {animal.breed}</Text>
                  <Text style={styles.itemSub}>Age: {animal.age}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={theme.gray} />
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Events Section */}
        <Section title="Calendar Events" onAdd={() => handleOpenEventModal()}>
          {eventsLoading ? (
            <ActivityIndicator color={theme.primaryGreen} />
          ) : eventsError ? (
            <Text style={styles.errorText}>{eventsError}</Text>
          ) : events.length === 0 ? (
            <Text style={styles.emptyStateText}>No events scheduled yet.</Text>
          ) : (
            events.map((event) => (
              <TouchableOpacity key={event.date + event.task} style={styles.itemRow} onPress={() => handleOpenEventModal(event)}>
                <View>
                  <Text style={styles.itemTitle}>{event.task}</Text>
                  <Text style={styles.itemSub}>{event.date} at {event.time} - {event.type}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={theme.gray} />
              </TouchableOpacity>
            ))
          )}
        </Section>
      </ScrollView>

      {/* --- Modals for Editing/Adding --- */}

      {/* Edit Profile Modal */}
      <Modal visible={editProfileVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <EditableField label="Name" value={editProfileData.name} onChangeText={(v) => setEditProfileData((d) => ({ ...d, name: v }))} />
            <EditableField label="Village" value={editProfileData.village} onChangeText={(v) => setEditProfileData((d) => ({ ...d, village: v }))} />
            <EditableField label="Phone Number" value={editProfileData.phoneNumber} onChangeText={(v) => setEditProfileData((d) => ({ ...d, phoneNumber: v }))} keyboardType="phone-pad" />
            <EditableField label="Language" value={editProfileData.language} onChangeText={(v) => setEditProfileData((d) => ({ ...d, language: v }))} />
            <EditableField label="Farm Size" value={editProfileData.farmSize} onChangeText={(v) => setEditProfileData((d) => ({ ...d, farmSize: v }))} />
            <EditableField label="Preferred Mode" value={editProfileData.preferredInteractionMode} onChangeText={(v) => setEditProfileData((d) => ({ ...d, preferredInteractionMode: v }))} />
            {/* Note: Farm Location and Farmer ID are typically not editable by the user directly */}

            <View style={styles.modalButtonContainer}>
              <CustomButton title="Cancel" onPress={() => setEditProfileVisible(false)} color={theme.darkGray} />
              <CustomButton title="Save Changes" onPress={handleSubmitEditProfile} disabled={editProfileLoading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Crop Modal (Add/Edit) */}
      <Modal visible={cropModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentCrop && currentCrop.cropId ? 'Edit Crop' : 'Add New Crop'}</Text>
            <EditableField label="Name" value={currentCrop?.name} onChangeText={(v) => setCurrentCrop((d) => ({ ...d, name: v }))} />
            <EditableField label="Planting Date (YYYY-MM-DD)" value={currentCrop?.plantingDate} onChangeText={(v) => setCurrentCrop((d) => ({ ...d, plantingDate: v }))} />
            <EditableField label="Total Duration (e.g., '90 days')" value={currentCrop?.totalDuration} onChangeText={(v) => setCurrentCrop((d) => ({ ...d, totalDuration: v }))} />

            <View style={styles.modalButtonContainer}>
              {currentCrop && currentCrop.cropId && (
                <CustomButton
                  title="Delete"
                  onPress={() => handleDeleteCrop(currentCrop.cropId)}
                  color={theme.red}
                  disabled={cropLoading}
                />
              )}
              <CustomButton title="Cancel" onPress={() => setCropModalVisible(false)} color={theme.darkGray} />
              <CustomButton
                title={cropLoading ? 'Saving...' : 'Save'}
                onPress={handleSubmitCrop}
                disabled={cropLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Livestock Modal (Add/Edit) */}
      <Modal visible={livestockModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentLivestock && currentLivestock.id ? 'Edit Livestock' : 'Add New Livestock'}</Text>
            <EditableField label="Name" value={currentLivestock?.name} onChangeText={(v) => setCurrentLivestock((d) => ({ ...d, name: v }))} />
            <EditableField label="Type" value={currentLivestock?.type} onChangeText={(v) => setCurrentLivestock((d) => ({ ...d, type: v }))} />
            <EditableField label="Breed" value={currentLivestock?.breed} onChangeText={(v) => setCurrentLivestock((d) => ({ ...d, breed: v }))} />
            <EditableField label="Age" value={currentLivestock?.age} onChangeText={(v) => setCurrentLivestock((d) => ({ ...d, age: v }))} keyboardType="numeric" />
            <EditableField label="Health Status" value={currentLivestock?.health} onChangeText={(v) => setCurrentLivestock((d) => ({ ...d, health: v }))} multiline />

            <View style={styles.modalButtonContainer}>
              {currentLivestock && currentLivestock.id && (
                <CustomButton
                  title="Delete"
                  onPress={() => handleDeleteLivestock(currentLivestock.id)}
                  color={theme.red}
                  disabled={livestockLoadingState}
                />
              )}
              <CustomButton title="Cancel" onPress={() => setLivestockModalVisible(false)} color={theme.darkGray} />
              <CustomButton
                title={livestockLoadingState ? 'Saving...' : 'Save'}
                onPress={handleSubmitLivestock}
                disabled={livestockLoadingState}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Modal (Add/Edit) */}
      <Modal visible={eventModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentEvent && currentEvent.task ? 'Edit Event' : 'Add New Event'}</Text>
            <EditableField label="Task" value={currentEvent?.task} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, task: v }))} />
            <EditableField label="Date (YYYY-MM-DD)" value={currentEvent?.date} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, date: v }))} />
            <EditableField label="Time (HH:MM)" value={currentEvent?.time} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, time: v }))} />
            <EditableField label="Type" value={currentEvent?.type} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, type: v }))} />
            <EditableField label="Priority" value={currentEvent?.priority} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, priority: v }))} />
            <EditableField label="Details" value={currentEvent?.details} onChangeText={(v) => setCurrentEvent((d) => ({ ...d, details: v }))} multiline />

            <View style={styles.modalButtonContainer}>
              {currentEvent && currentEvent.task && (
                <CustomButton
                  title="Delete"
                  onPress={() => handleDeleteEvent(currentEvent.task)}
                  color={theme.red}
                  disabled={eventLoadingState}
                />
              )}
              <CustomButton title="Cancel" onPress={() => setEventModalVisible(false)} color={theme.darkGray} />
              <CustomButton
                title={eventLoadingState ? 'Saving...' : 'Save'}
                onPress={handleSubmitEvent}
                disabled={eventLoadingState}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.black,
  },
  container: {
    padding: 20,
    backgroundColor: theme.black,
    paddingBottom: 40, // Add some padding at the bottom for scroll
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.black,
    borderBottomWidth: 1,
    borderBottomColor: theme.mediumGray,
    ...Platform.select({
      ios: {
        shadowColor: theme.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  backBtn: {
    padding: 6,
    marginRight: 12,
  },
  headerTitle: {
    color: theme.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: theme.lightGray,
    borderRadius: 16,
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.primaryGreen,
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.white,
    marginBottom: 4,
  },
  village: {
    fontSize: 18,
    color: theme.gray,
    marginBottom: 8,
  },
  sectionOuter: {
    marginTop: 28,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4, // Aligns with section padding
  },
  sectionHeader: {
    color: theme.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionButton: {
    marginLeft: 15,
    padding: 2,
  },
  section: {
    backgroundColor: theme.lightGray,
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: theme.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.mediumGray,
  },
  fieldLabel: {
    fontSize: 16,
    color: theme.gray,
  },
  fieldValue: {
    fontSize: 16,
    color: theme.white,
    fontWeight: '500',
    flexShrink: 1, // Allow text to wrap
    textAlign: 'right', // Align value to the right
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.mediumGray,
  },
  itemTitle: {
    color: theme.white,
    fontSize: 17,
    fontWeight: '600',
  },
  itemType: {
    color: theme.gray,
    fontSize: 14,
    fontWeight: 'normal',
  },
  itemSub: {
    color: theme.gray,
    fontSize: 14,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.gray,
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: theme.red,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    color: theme.gray,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.lightGray,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%', // Limit height for larger forms
    ...Platform.select({
      ios: {
        shadowColor: theme.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    color: theme.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  editableFieldContainer: {
    marginBottom: 16,
  },
  editableFieldLabel: {
    color: theme.gray,
    marginBottom: 6,
    fontSize: 14,
  },
  editableFieldInput: {
    backgroundColor: theme.mediumGray,
    color: theme.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10, // Adjust padding for different platforms
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.darkGray,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top', // For Android multiline input alignment
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Evenly distribute buttons
    marginTop: 24,
  },
  customButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default FarmerProfileScreen;