import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MarketplaceScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('market');
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  const marketData = [
    {
      id: 1,
      name: 'Wheat',
      price: 245.50,
      change: +12.30,
      changePercent: +5.27,
      volume: '2.4K tons',
      high: 248.00,
      low: 232.10,
      emoji: '🌾'
    },
    {
      id: 2,
      name: 'Rice',
      price: 189.75,
      change: -8.45,
      changePercent: -4.26,
      volume: '3.1K tons',
      high: 198.20,
      low: 185.30,
      emoji: '🍚'
    },
    {
      id: 3,
      name: 'Corn',
      price: 156.20,
      change: +3.80,
      changePercent: +2.49,
      volume: '1.8K tons',
      high: 159.40,
      low: 152.60,
      emoji: '🌽'
    },
    {
      id: 4,
      name: 'Tomatoes',
      price: 78.90,
      change: +15.60,
      changePercent: +24.64,
      volume: '890 tons',
      high: 82.50,
      low: 63.30,
      emoji: '🍅'
    },
    {
      id: 5,
      name: 'Potatoes',
      price: 34.50,
      change: -2.10,
      changePercent: -5.74,
      volume: '1.2K tons',
      high: 38.70,
      low: 33.80,
      emoji: '🥔'
    },
    {
      id: 6,
      name: 'Milk',
      price: 28.75,
      change: +1.25,
      changePercent: +4.55,
      volume: '5.6K liters',
      high: 29.10,
      low: 27.50,
      emoji: '🥛'
    }
  ];

  const myListings = [
    {
      id: 1,
      name: 'Organic Wheat',
      quantity: '50 tons',
      myPrice: 260.00,
      marketPrice: 245.50,
      status: 'active',
      views: 24,
      inquiries: 3,
      emoji: '🌾'
    },
    {
      id: 2,
      name: 'Fresh Milk',
      quantity: '200 liters/day',
      myPrice: 32.00,
      marketPrice: 28.75,
      status: 'active',
      views: 18,
      inquiries: 7,
      emoji: '🥛'
    },
    {
      id: 3,
      name: 'Free Range Eggs',
      quantity: '500 dozen',
      myPrice: 12.50,
      marketPrice: 11.80,
      status: 'pending',
      views: 12,
      inquiries: 2,
      emoji: '🥚'
    }
  ];

  const handlePriceUpdate = (item) => {
    setEditingItem(item);
    setNewPrice(item.myPrice.toString());
  };

  const savePriceUpdate = () => {
    Alert.alert(
      'Price Updated',
      `${editingItem.name} price updated to ₹${newPrice}`,
      [{ text: 'OK', onPress: () => {
        setEditingItem(null);
        setNewPrice('');
      }}]
    );
  };

  const renderMarketItem = (item) => {
    const isPositive = item.change > 0;
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    
    return (
      <TouchableOpacity key={item.id} style={styles.marketCard}>
        <View style={styles.marketHeader}>
          <View style={styles.marketInfo}>
            <Text style={styles.cropEmoji}>{item.emoji}</Text>
            <View style={styles.cropDetails}>
              <Text style={styles.cropName}>{item.name}</Text>
              <Text style={styles.volume}>Vol: {item.volume}</Text>
            </View>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.price}>₹{item.price}</Text>
            <View style={[styles.changeContainer, { backgroundColor: changeColor + '20' }]}>
              <Ionicons 
                name={isPositive ? "trending-up" : "trending-down"} 
                size={12} 
                color={changeColor} 
              />
              <Text style={[styles.change, { color: changeColor }]}>
                {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.marketStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[styles.statValue, { color: changeColor }]}>
              ₹{Math.abs(item.change).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={styles.statValue}>₹{item.high}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={styles.statValue}>₹{item.low}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyListing = (item) => {
    const priceDiff = item.myPrice - item.marketPrice;
    const isPriceAboveMarket = priceDiff > 0;
    const priceCompColor = isPriceAboveMarket ? '#F59E0B' : '#10B981';
    
    return (
      <View key={item.id} style={styles.listingCard}>
        <View style={styles.listingHeader}>
          <View style={styles.listingInfo}>
            <Text style={styles.cropEmoji}>{item.emoji}</Text>
            <View style={styles.cropDetails}>
              <Text style={styles.cropName}>{item.name}</Text>
              <Text style={styles.quantity}>{item.quantity}</Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'active' ? '#10B981' : '#F59E0B' }
          ]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.priceComparison}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Your Price:</Text>
            <Text style={styles.myPrice}>₹{item.myPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Market Price:</Text>
            <Text style={styles.marketPriceText}>₹{item.marketPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Difference:</Text>
            <Text style={[styles.priceDiff, { color: priceCompColor }]}>
              {isPriceAboveMarket ? '+' : ''}₹{priceDiff.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.listingStats}>
          <View style={styles.statBox}>
            <Ionicons name="eye-outline" size={16} color="#64748B" />
            <Text style={styles.statNumber}>{item.views}</Text>
            <Text style={styles.statText}>Views</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="location-outline" size={16} color="#64748B" />
            <Text style={styles.statNumber}>{item.inquiries}</Text>
            <Text style={styles.statText}>Inquiries</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handlePriceUpdate(item)}
          >
            <Ionicons name="create-outline" size={16} color="#3B82F6" />
            <Text style={styles.editText}>Edit Price</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <Text style={styles.headerSubtitle}>Live market prices & listings</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'market' && styles.activeTab]}
          onPress={() => setSelectedTab('market')}
        >
          <Ionicons 
            name="bar-chart-outline" 
            size={20} 
            color={selectedTab === 'market' ? '#10B981' : '#64748B'} 
          />
          <Text style={[
            styles.tabText, 
            selectedTab === 'market' && styles.activeTabText
          ]}>
            Market Prices
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'listings' && styles.activeTab]}
          onPress={() => setSelectedTab('listings')}
        >
          <Ionicons 
            name="cash-outline" 
            size={20} 
            color={selectedTab === 'listings' ? '#10B981' : '#64748B'} 
          />
          <Text style={[
            styles.tabText, 
            selectedTab === 'listings' && styles.activeTabText
          ]}>
            My Listings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedTab === 'market' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Market Prices</Text>
              <Text style={styles.lastUpdated}>Updated 5 min ago</Text>
            </View>
            {marketData.map(renderMarketItem)}
          </View>
        )}

        {selectedTab === 'listings' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Listings ({myListings.length})</Text>
              <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={20} color="#10B981" />
              </TouchableOpacity>
            </View>
            {myListings.map(renderMyListing)}
          </View>
        )}
      </ScrollView>

      {/* Price Edit Modal */}
      {editingItem && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Update Price for {editingItem.name}</Text>
            <Text style={styles.modalSubtitle}>Market Price: ₹{editingItem.marketPrice}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Price (₹)</Text>
              <TextInput
                style={styles.priceInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="Enter new price"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditingItem(null);
                  setNewPrice('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={savePriceUpdate}
              >
                <Text style={styles.saveText}>Update Price</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  activeTab: {
    backgroundColor: '#10B981' + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#10B981',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#64748B',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  marketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cropDetails: {
    flex: 1,
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  volume: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  quantity: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  marketStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  listingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceComparison: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  myPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  marketPriceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  priceDiff: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6' + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#475569',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#2D3748',
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default MarketplaceScreen;