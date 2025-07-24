import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  SafeAreaView,
  Alert,
  Vibration,
  Modal,
  Button
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const API_CONFIG = {
  BASE_URL: 'http://192.168.1.13:8000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

const FARMER_PROFILE = {
  id: 'f001'
};

const { width, height } = Dimensions.get('window');

// Professional color palette
const COLORS = {
  primary: '#000000',
  secondary: '#111111',
  tertiary: '#1a1a1a',
  quaternary: '#2a2a2a',
  accent: '#4CAF50', // Updated to match app's primary green
  accentSecondary: '#0099ff',
  text: '#ffffff',
  textSecondary: '#cccccc',
  textTertiary: '#888888',
  success: '#4CAF50', // Updated to match app's primary green
  warning: '#ffaa00',
  error: '#ff4444',
  border: '#333333',
  card: '#1a1a1a',
  cardElevated: '#222222'
};

const TYPOGRAPHY = {
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '500' },
  caption: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' }
};

// API Service
class RentalAPI {
  static async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async searchRentals(query, farmerId) {
    return this.makeRequest('/rental/search', {
      method: 'POST',
      body: JSON.stringify({ 
        query: query.trim(),
        farmerId,
        limit: 20,
        includeMyProducts: true,
        includeMyListings: true
      })
    });
  }

  static async getFeaturedRentals(farmerId) {
    return this.makeRequest(`/rental/featured?farmerId=${farmerId}`);
  }

  static async getMyActivity(farmerId) {
    return this.makeRequest(`/rental/activity?farmerId=${farmerId}`);
  }
}

// Enhanced Listing Card Component
const ListingCard = React.memo(({ item, onPress, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return COLORS.success;
      case 'rented': return COLORS.warning;
      case 'maintenance': return COLORS.error;
      default: return COLORS.textTertiary;
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={styles.listingCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ 
              uri: item.image || 'https://via.placeholder.com/280x160/1a1a1a/888888?text=No+Image' 
            }} 
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{item.category || 'Equipment'}</Text>
          </View>
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.cardMeta}>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location?.village || item.location || 'Location not specified'}
              </Text>
            </View>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceText}>
                {item.price || item.price_per_day || 'Price on request'}
              </Text>
              <Text style={styles.priceUnit}>
                {item.price_unit || 'per day'}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.bookButton} onPress={onPress}>
              <Text style={styles.bookButtonText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Activity Card Component
const ActivityCard = React.memo(({ item, type }) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'purchase': return 'bag-check-outline';
      case 'rental': return 'time-outline';
      case 'listing': return 'list-outline';
      default: return 'document-outline';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'purchase': return COLORS.success;
      case 'rental': return COLORS.accentSecondary;
      case 'listing': return COLORS.accent;
      default: return COLORS.textTertiary;
    }
  };

  return (
    <TouchableOpacity style={styles.activityCard}>
      <View style={[styles.activityIcon, { backgroundColor: getTypeColor() + '20' }]}>
        <Ionicons name={getTypeIcon()} size={24} color={getTypeColor()} />
      </View>
      
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.activityStatus}>
          {item.status} {item.date && `• ${item.date}`}
        </Text>
        {item.description && (
          <Text style={styles.activityDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      
      <View style={styles.activityPrice}>
        <Text style={styles.activityPriceText}>
          {item.price || item.price_per_day || '---'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Enhanced Section Component
const SectionHeader = ({ title, subtitle, onSeeAll }) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
        <Text style={styles.seeAllText}>See All</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
      </TouchableOpacity>
    )}
  </View>
);

const SectionCarousel = ({ title, subtitle, data, renderItem, cardWidth = 240, emptyText, onSeeAll }) => {
  // Determine if this section should be center aligned
  const isCenterAligned = title === 'Featured Equipment' || title === 'Recent Activity';
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={[styles.sectionHeader, isCenterAligned && { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }]}> 
        <Text style={[styles.sectionTitle, isCenterAligned && { textAlign: 'center', width: '100%' }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, isCenterAligned && { textAlign: 'center', width: '100%' }]}>{subtitle}</Text>}
        {onSeeAll && !isCenterAligned && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>
      {data && data.length > 0 ? (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 12, paddingRight: 12 }}
          snapToInterval={cardWidth + 16}
          decelerationRate="fast"
        />
      ) : (
        <Text style={{ color: '#a1a1aa', marginLeft: 18, marginTop: 8, fontSize: 15 }}>{emptyText || 'No items found.'}</Text>
      )}
    </View>
  );
};

// Main Component
export default function RentalScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({
    matches: [],
    myProducts: [],
    myListings: []
  });
  const [featuredRentals, setFeaturedRentals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listForm, setListForm] = useState({ name: '', description: '', price_per_day: '', location: '' });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingItem, setBookingItem] = useState(null);
  const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', notes: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimeoutRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const featuredKey = `rental_featured_${FARMER_PROFILE.id}`;
    const activityKey = `rental_activity_${FARMER_PROFILE.id}`;
    // Try to load from cache first
    const [cachedFeatured, cachedActivity] = await Promise.all([
      AsyncStorage.getItem(featuredKey),
      AsyncStorage.getItem(activityKey)
    ]);
    if (cachedFeatured) setFeaturedRentals(JSON.parse(cachedFeatured));
    if (cachedActivity) {
      const activity = JSON.parse(cachedActivity);
      setRecentActivity([
        ...(activity.myProducts || []),
        ...(activity.myListings || [])
      ]);
    }
    // Fetch fresh data in background
    try {
      const [featured, activity] = await Promise.all([
        RentalAPI.getFeaturedRentals(FARMER_PROFILE.id).catch(() => ({})),
        RentalAPI.getMyActivity(FARMER_PROFILE.id).catch(() => ({}))
      ]);
      setFeaturedRentals(featured.featured || []);
      setRecentActivity([
        ...(activity.myProducts || []),
        ...(activity.myListings || [])
      ]);
      // Update cache
      AsyncStorage.setItem(featuredKey, JSON.stringify(featured.featured || []));
      AsyncStorage.setItem(activityKey, JSON.stringify(activity));
    } catch (err) {
      // Optionally handle error
    }
  };

  // Debounced search
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length === 0) {
      setSearchResults({ matches: [], myProducts: [], myListings: [] });
      setError(null);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await RentalAPI.searchRentals(text, FARMER_PROFILE.id);
        setSearchResults({
          matches: response.matches || [],
          myProducts: response.myProducts || [],
          myListings: response.myListings || []
        });

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
      } catch (err) {
        setError('Failed to search rentals. Please try again.');
        setSearchResults({ matches: [], myProducts: [], myListings: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [fadeAnim]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleListingPress = (item) => {
    Vibration.vibrate(50);
    // Navigate to listing details
    navigation.navigate('ListingDetails', { listing: item });
  };

  const handleListEquipment = async () => {
    setListLoading(true);
    setListError('');
    try {
      const payload = {
        name: listForm.name,
        description: listForm.description,
        price_per_day: Number(listForm.price_per_day),
        location: { village: listForm.location },
        owner: { farmerId: FARMER_PROFILE.id },
        type: 'rent',
        available: true,
        image: '',
      };
      const res = await fetch(`${API_CONFIG.BASE_URL}/rental/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to list equipment');
      setShowListModal(false);
      setListForm({ name: '', description: '', price_per_day: '', location: '' });
      loadInitialData();
    } catch (e) {
      setListError('Could not list equipment. Try again.');
    } finally {
      setListLoading(false);
    }
  };

  const handleBookNow = (item) => {
    setBookingItem(item);
    setBookingForm({ startDate: '', endDate: '', notes: '' });
    setBookingError('');
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async () => {
    setBookingLoading(true);
    setBookingError('');
    try {
      const payload = {
        equipmentId: bookingItem.id || bookingItem.equipmentId || bookingItem._id,
        farmerId: FARMER_PROFILE.id,
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        notes: bookingForm.notes,
      };
      const res = await fetch(`${API_CONFIG.BASE_URL}/rental/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Booking failed');
      setShowBookingModal(false);
      setBookingItem(null);
      setBookingForm({ startDate: '', endDate: '', notes: '' });
      Alert.alert('Booking Confirmed', 'Your booking was successful!');
      loadInitialData();
    } catch (e) {
      setBookingError('Could not complete booking. Try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const renderSearchResults = () => (
    <Animated.View style={[styles.searchResults, { opacity: fadeAnim }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <SectionCarousel
          title="Available Equipment"
          subtitle={`${searchResults.matches.length} items found`}
          data={searchResults.matches}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() => handleBookNow(item)}
              style={styles.carouselCard}
            />
          )}
          onSeeAll={() => navigation.navigate('AllListings', { type: 'available' })}
        />

        <SectionCarousel
          title="My Purchase History"
          subtitle="Recently bought items"
          data={searchResults.myProducts}
          renderItem={({ item }) => (
            <ActivityCard item={item} type="purchase" />
          )}
          cardWidth={200}
          onSeeAll={() => navigation.navigate('PurchaseHistory')}
        />

        <SectionCarousel
          title="My Active Listings"
          subtitle="Items I'm renting out"
          data={searchResults.myListings}
          renderItem={({ item }) => (
            <ActivityCard item={item} type="listing" />
          )}
          cardWidth={200}
          onSeeAll={() => navigation.navigate('MyListings')}
        />
      </ScrollView>
      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#000' }}>Book Equipment</Text>
            <Text style={{ color: '#333', marginBottom: 8 }}>{bookingItem?.name}</Text>
            <TextInput
              placeholder="Start Date (YYYY-MM-DD)"
              value={bookingForm.startDate}
              onChangeText={t => setBookingForm(f => ({ ...f, startDate: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, color: '#000' }}
            />
            <TextInput
              placeholder="End Date (YYYY-MM-DD)"
              value={bookingForm.endDate}
              onChangeText={t => setBookingForm(f => ({ ...f, endDate: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, color: '#000' }}
            />
            <TextInput
              placeholder="Notes (optional)"
              value={bookingForm.notes}
              onChangeText={t => setBookingForm(f => ({ ...f, notes: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, padding: 8, color: '#000' }}
              multiline
            />
            {bookingError ? <Text style={{ color: 'red', marginBottom: 8 }}>{bookingError}</Text> : null}
            {bookingLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Button title="Book Now" onPress={handleSubmitBooking} />
            )}
            <Button title="Cancel" color="#888" onPress={() => setShowBookingModal(false)} />
          </View>
        </View>
      </Modal>
    </Animated.View>
  );

  const renderDefaultContent = () => (
    <ScrollView
      style={styles.defaultContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <SectionCarousel
        title="Featured Equipment"
        subtitle="Popular rentals in your area"
        data={featuredRentals}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            onPress={() => handleListingPress(item)}
            style={styles.carouselCard}
          />
        )}
        onSeeAll={() => navigation.navigate('Featured')}
      />

      <SectionCarousel
        title="Recent Activity"
        subtitle="Your rental history"
        data={recentActivity}
        renderItem={({ item }) => (
          <ActivityCard item={item} type="rental" />
        )}
        cardWidth={200}
        onSeeAll={() => navigation.navigate('Activity')}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowListModal(true)}>
            <Ionicons name="add-circle-outline" size={32} color={COLORS.accent} />
            <Text style={styles.actionText}>List Equipment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyBookings')}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.accentSecondary} />
            <Text style={styles.actionText}>My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Earnings')}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.warning} />
            <Text style={styles.actionText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="settings-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* List Equipment Modal */}
      <Modal
        visible={showListModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowListModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#000' }}>List New Equipment</Text>
            <TextInput
              placeholder="Equipment Name"
              value={listForm.name}
              onChangeText={t => setListForm(f => ({ ...f, name: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, color: '#000' }}
            />
            <TextInput
              placeholder="Description"
              value={listForm.description}
              onChangeText={t => setListForm(f => ({ ...f, description: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, color: '#000' }}
              multiline
            />
            <TextInput
              placeholder="Price per day (₹)"
              value={listForm.price_per_day}
              onChangeText={t => setListForm(f => ({ ...f, price_per_day: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, padding: 8, color: '#000' }}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Village/Location"
              value={listForm.location}
              onChangeText={t => setListForm(f => ({ ...f, location: t }))}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, padding: 8, color: '#000' }}
            />
            {listError ? <Text style={{ color: 'red', marginBottom: 8 }}>{listError}</Text> : null}
            {listLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Button title="List Equipment" onPress={handleListEquipment} />
            )}
            <Button title="Cancel" color="#888" onPress={() => setShowListModal(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: 40 }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Equipment Rental</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {FARMER_PROFILE.name}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('FarmerProfile', { farmerId: FARMER_PROFILE.id })}
        >
          <Ionicons name="person-circle-outline" size={32} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tractors, harvesters, tools..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={COLORS.accent} />
          )}
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleSearch(searchQuery)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {searchQuery.trim() ? renderSearchResults() : renderDefaultContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    // *** MODIFICATION START ***
    justifyContent: 'space-between', // Distributes space between items
    // No need for alignContent here, alignItems handles vertical alignment
    // *** MODIFICATION END ***
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: COLORS.tertiary,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center' ,
    alignItems: 'center'    
  },
  headerTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.text,
    alignContent: 'center',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.secondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tertiary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginLeft: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.error + '20',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  retryButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchResults: {
    flex: 1,
  },
  defaultContent: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    marginRight: 4,
    fontWeight: '600',
  },
  carouselContainer: {
    paddingLeft: 60,
    paddingRight: 60,
  },
  carouselCard: {
    marginRight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 12,
  },
  listingCard: {
    width: 280,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    paddingLeft:2,
    borderColor: COLORS.border,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.tertiary,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.accent + 'E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text,
    fontWeight: '600',
  },
  cardContent: {
    padding: 26,
  },
  cardTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 20
  },
  cardDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
    fontWeight: '700',
  },
  priceUnit: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bookButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  activityCard: {
    width: 200,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  activityStatus: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  activityDescription: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  activityPrice: {
    alignItems: 'flex-end',
  },
  activityPriceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '600',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
});