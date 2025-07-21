import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE = 'http://10.123.4.245:8000'; // Use device IP for backend
const FARMER_ID = 'f001';

// --- Initial Data ---
const initialMarketData = [
    { id: 1, name: 'Wheat', price: 245.50, change: +12.30, changePercent: +5.27, volume: '2.4K tons', high: 248.00, low: 232.10, emoji: '🌾' },
    { id: 2, name: 'Rice', price: 189.75, change: -8.45, changePercent: -4.26, volume: '3.1K tons', high: 198.20, low: 185.30, emoji: '🍚' },
    { id: 3, name: 'Corn', price: 156.20, change: +3.80, changePercent: +2.49, volume: '1.8K tons', high: 159.40, low: 152.60, emoji: '🌽' },
];
const initialMyListings = [
    { id: 1, name: 'Organic Wheat', quantity: '50 tons', myPrice: 260.00, marketPrice: 245.50, status: 'active', views: 24, inquiries: 3, emoji: '🌾' },
    { id: 2, name: 'Fresh Milk', quantity: '200 liters/day', myPrice: 32.00, marketPrice: 28.75, status: 'active', views: 18, inquiries: 7, emoji: '🥛' },
];

// --- Reusable Components ---
const AnimatedListItem = ({ children, index }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }).start();
    }, [fadeAnim, index]);
    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            {children}
        </Animated.View>
    );
};

// --- Main Screen ---
const MarketplaceScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('market');
  const [marketData, setMarketData] = useState([]); // Will be fetched from backend
  const [myListings, setMyListings] = useState([]); // Will be fetched from backend
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null for new, item object for editing
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productEmoji, setProductEmoji] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setProductName('');
    setProductQuantity('');
    setProductPrice('');
    setProductEmoji('');
    setIsModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setProductName(item.name);
    setProductQuantity(item.quantity);
    setProductPrice(item.myPrice.toString());
    setProductEmoji(item.emoji);
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!productName || !productQuantity || !productPrice) {
      Alert.alert('Missing Information', 'Please fill out all fields.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editingItem) {
      setMyListings(myListings.map(item =>
        item.id === editingItem.id
          ? { ...item, name: productName, quantity: productQuantity, myPrice: parseFloat(productPrice), emoji: productEmoji || '📦' }
          : item
      ));
      Alert.alert('Success', `${productName} has been updated.`);
    } else {
      const newListing = {
        id: Date.now(),
        name: productName,
        quantity: productQuantity,
        myPrice: parseFloat(productPrice),
        marketPrice: marketData.find(p => p.name.toLowerCase() === productName.toLowerCase())?.price || 0,
        status: 'active',
        views: 0,
        inquiries: 0,
        emoji: productEmoji || '📦',
      };
      setMyListings([newListing, ...myListings]);
      Alert.alert('Success', `${productName} has been added to your listings.`);
    }
    setIsModalVisible(false);
  };

  const handleDelete = (itemToDelete) => {
    Alert.alert(
      "Delete Listing",
      `Are you sure you want to delete "${itemToDelete.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMyListings(myListings.filter(item => item.id !== itemToDelete.id));
          }
        }
      ]
    );
  };


  const renderMarketItem = (item, index) => {
    const isPositive = item.change > 0;
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    const glowColor = isPositive ? '#10b981' : '#ef4444';
    return (
        <AnimatedListItem index={index} key={item.id}>
            <TouchableOpacity style={styles.marketCard} activeOpacity={0.9}>
                 <View style={[StyleSheet.absoluteFillObject, styles.cardGlow]}>
                    <LinearGradient colors={[glowColor, 'transparent']} style={styles.glowGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                </View>
                <LinearGradient colors={['#18181b', '#27272a']} style={styles.marketCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.marketHeader}>
                        <View style={styles.marketInfo}><Text style={styles.cropEmoji}>{item.emoji}</Text><View><Text style={styles.cropName}>{item.name}</Text><Text style={styles.volume}>Vol: {item.volume}</Text></View></View>
                        <View style={styles.priceInfo}><Text style={styles.price}>₹{item.price.toFixed(1)}</Text><View style={[styles.changeContainer, { backgroundColor: changeColor + '20' }]}><Ionicons name={isPositive ? "trending-up" : "trending-down"} size={12} color={changeColor} /><Text style={[styles.change, { color: changeColor }]}>{isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%</Text></View></View>
                    </View>
                    <View style={styles.marketStats}>
                        <View style={styles.statItem}><Text style={styles.statLabel}>Change</Text><Text style={[styles.statValue, { color: changeColor }]}>₹{Math.abs(item.change).toFixed(2)}</Text></View>
                        <View style={styles.statItem}><Text style={styles.statLabel}>High</Text><Text style={styles.statValue}>₹{item.high.toFixed(1)}</Text></View>
                        <View style={styles.statItem}><Text style={styles.statLabel}>Low</Text><Text style={styles.statValue}>₹{item.low.toFixed(1)}</Text></View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </AnimatedListItem>
    );
  };

  const renderMyListing = (item, index) => {
    const priceDiff = item.myPrice - item.marketPrice;
    const isPriceAboveMarket = priceDiff > 0;
    const priceCompColor = isPriceAboveMarket ? '#F59E0B' : '#10B981';
    return (
        <AnimatedListItem index={index} key={item.id}>
            <View style={styles.listingCard}>
                <LinearGradient colors={['#18181b', '#27272a']} style={styles.marketCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.listingHeader}><View style={styles.listingInfo}><Text style={styles.cropEmoji}>{item.emoji}</Text><View><Text style={styles.cropName}>{item.name}</Text><Text style={styles.quantity}>{item.quantity}</Text></View></View><View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10B981' : '#F59E0B' }]}><Text style={styles.statusText}>{item.status.toUpperCase()}</Text></View></View>
                    <View style={styles.priceComparison}><View style={styles.priceRow}><Text style={styles.priceLabel}>Your Price:</Text><Text style={styles.myPrice}>₹{item.myPrice.toFixed(2)}</Text></View><View style={styles.priceRow}><Text style={styles.priceLabel}>Market Price:</Text><Text style={styles.marketPriceText}>₹{item.marketPrice.toFixed(2)}</Text></View><View style={styles.priceRow}><Text style={styles.priceLabel}>Difference:</Text><Text style={[styles.priceDiff, { color: priceCompColor }]}>{isPriceAboveMarket ? '+' : ''}₹{priceDiff.toFixed(2)}</Text></View></View>
                    <View style={styles.listingStats}>
                        <View style={styles.statsGroup}><View style={styles.statBox}><Ionicons name="eye-outline" size={16} color="#64748B" /><Text style={styles.statNumber}>{item.views}</Text><Text style={styles.statText}>Views</Text></View><View style={styles.statBox}><Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" /><Text style={styles.statNumber}>{item.inquiries}</Text><Text style={styles.statText}>Inquiries</Text></View></View>
                        <View style={styles.actionsContainer}><TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}><Ionicons name="create-outline" size={16} color="#3B82F6" /><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity></View>
                    </View>
                </LinearGradient>
            </View>
        </AnimatedListItem>
    );
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/farmer/${FARMER_ID}/market`)
      .then(res => res.json())
      .then(data => {
        setMyListings(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load listings');
        setLoading(false);
      });
    // Optionally, fetch market prices from another endpoint if needed
    // For now, use listings as marketData for demo
    setMarketData([
      { id: 1, name: 'Wheat', price: 245.50, change: +12.30, changePercent: +5.27, volume: '2.4K tons', high: 248.00, low: 232.10, emoji: '🌾' },
      { id: 2, name: 'Rice', price: 189.75, change: -8.45, changePercent: -4.26, volume: '3.1K tons', high: 198.20, low: 185.30, emoji: '🍚' },
      { id: 3, name: 'Corn', price: 156.20, change: +3.80, changePercent: +2.49, volume: '1.8K tons', high: 159.40, low: 152.60, emoji: '🌽' },
    ]);
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color="#FFFFFF" /></TouchableOpacity><View style={styles.headerContent}><Text style={styles.headerTitle}>Marketplace</Text><Text style={styles.headerSubtitle}>Live market prices & listings</Text></View><View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View></View>
      <View style={styles.tabContainer}><TouchableOpacity style={[styles.tab, selectedTab === 'market' && styles.activeTab]} onPress={() => setSelectedTab('market')}><Ionicons name="stats-chart" size={20} color={selectedTab === 'market' ? '#10B981' : '#64748B'} /><Text style={[styles.tabText, selectedTab === 'market' && styles.activeTabText]}>Market Prices</Text></TouchableOpacity><TouchableOpacity style={[styles.tab, selectedTab === 'listings' && styles.activeTab]} onPress={() => setSelectedTab('listings')}><Ionicons name="list" size={20} color={selectedTab === 'listings' ? '#10B981' : '#64748B'} /><Text style={[styles.tabText, selectedTab === 'listings' && styles.activeTabText]}>My Listings</Text></TouchableOpacity></View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: 'red' }}>{error}</Text></View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {selectedTab === 'market' && (<View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today's Market Prices</Text><Text style={styles.lastUpdated}>Updated 5 min ago</Text></View>{marketData.map((item, index) => renderMarketItem(item, index))}</View>)}
          {selectedTab === 'listings' && (<View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your Listings ({myListings.length})</Text><TouchableOpacity style={styles.addButton} onPress={openAddModal}><Ionicons name="add" size={20} color="#10B981" /></TouchableOpacity></View>{myListings.map((item, index) => renderMyListing(item, index))}</View>)}
        </ScrollView>
      )}
      {isModalVisible && (
        <View style={styles.modalOverlay}>
            <Animated.View style={styles.modal}>
                <Text style={styles.modalTitle}>{editingItem ? 'Edit Listing' : 'Add New Listing'}</Text>
                <View style={styles.inputContainer}><Text style={styles.inputLabel}>Product Name</Text><TextInput style={styles.priceInput} value={productName} onChangeText={setProductName} placeholder="e.g., Organic Wheat" placeholderTextColor="#64748B" /></View>
                <View style={styles.inputContainer}><Text style={styles.inputLabel}>Quantity</Text><TextInput style={styles.priceInput} value={productQuantity} onChangeText={setProductQuantity} placeholder="e.g., 50 tons" placeholderTextColor="#64748B" /></View>
                <View style={styles.inputContainer}><Text style={styles.inputLabel}>Your Price (₹)</Text><TextInput style={styles.priceInput} value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" placeholder="e.g., 260.00" placeholderTextColor="#64748B" /></View>
                <View style={styles.inputContainer}><Text style={styles.inputLabel}>Emoji (Optional)</Text><TextInput style={styles.priceInput} value={productEmoji} onChangeText={setProductEmoji} placeholder="e.g., 🌾" placeholderTextColor="#64748B" /></View>
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
                </View>
            </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#000' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: 'bold', color: '#10B981' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, backgroundColor: '#18181b', borderRadius: 12, marginHorizontal: 20, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: '#27272a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginLeft: 8 },
  activeTabText: { color: '#10B981' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  lastUpdated: { fontSize: 12, color: '#64748B' },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  marketCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  marketCardGradient: { padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardGlow: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 17, opacity: 0.3 },
  glowGradient: { flex: 1 },
  marketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  marketInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  cropEmoji: { fontSize: 32, marginRight: 12 },
  cropName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  volume: { fontSize: 12, color: '#64748B', marginTop: 2 },
  quantity: { fontSize: 12, color: '#64748B', marginTop: 2 },
  priceInfo: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  changeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  change: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  marketStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272a' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  listingCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
  priceComparison: { backgroundColor: '#27272a', borderRadius: 8, padding: 12, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#64748B' },
  myPrice: { fontSize: 14, fontWeight: 'bold', color: '#10B981' },
  marketPriceText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  priceDiff: { fontSize: 14, fontWeight: 'bold' },
  listingStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsGroup: { flex: 1, flexDirection: 'row' },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  statText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F620', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  editText: { fontSize: 12, fontWeight: '500', color: '#3B82F6', marginLeft: 4 },
  deleteButton: { alignItems: 'center', justifyContent: 'center', width: 34, height: 34, backgroundColor: '#EF444420', borderRadius: 8, marginLeft: 8 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: '#18181b', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: '#9ca3af', marginBottom: 8 },
  priceInput: { backgroundColor: '#27272a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#FFFFFF', borderWidth: 1, borderColor: '#475569' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 8, backgroundColor: '#27272a', borderRadius: 8 },
  saveButton: { flex: 1, paddingVertical: 12, alignItems: 'center', marginLeft: 8, backgroundColor: '#10B981', borderRadius: 8 },
  cancelText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  saveText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
});

export default MarketplaceScreen;