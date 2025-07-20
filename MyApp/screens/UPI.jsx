import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const UPIScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main' or 'payment'

  // Mock UPI Scan QR state
  const [scanQRModalVisible, setScanQRModalVisible] = useState(false);
  const [scanStep, setScanStep] = useState('camera'); // camera, form, pin, success
  const [mockAmount, setMockAmount] = useState('');
  const [mockRemark, setMockRemark] = useState('');
  const [mockPin, setMockPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [successAnim] = useState(new Animated.Value(0));

  // Mock Pay Anyone state
  const [payAnyoneInput, setPayAnyoneInput] = useState('');
  const payAnyoneRecents = [
    { name: 'Anilkumar Saroj', phone: '+91 99308 04309', color: '#a21caf', initial: 'A' },
  ];
  const payAnyoneAll = [
    { type: 'self', name: 'Self transfer', desc: 'Transfer money between your accounts', color: '#2563eb', icon: 'person' },
    { type: 'group', name: 'New group', desc: 'Start group chat or split an expense', color: '#2563eb', icon: 'group-add' },
    { name: '5B30 viraj verma', phone: '+91 70214 51277', color: '#6366f1', initial: '5' },
    { name: 'Aadi Tendulkar', phone: '+91 99205 13049', color: '#64748b', initial: 'A', avatar: true },
  ];
  const openPayAnyone = () => {
    setPayAnyoneInput('');
    navigation.navigate('PayAnyone');
  };
  const closePayAnyone = () => setPayAnyoneModalVisible(false);

  const MOCK_RECIPIENT = { name: 'Demo Merchant', upi: 'merchant@upi' };
  const MOCK_PIN = '1234';

  const openScanQR = () => {
    setScanStep('camera');
    setScanQRModalVisible(true);
    setMockAmount('');
    setMockRemark('');
    setMockPin('');
    setPinError('');
    successAnim.setValue(0);
  };
  const closeScanQR = () => setScanQRModalVisible(false);

  const handleFakeScan = () => setScanStep('form');
  const handlePay = () => setScanStep('pin');
  const handlePinSubmit = () => {
    if (mockPin === MOCK_PIN) {
      setPinError('');
      setScanStep('success');
      Animated.timing(successAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } else {
      setPinError('Incorrect PIN. Try 1234.');
    }
  };
  const handlePracticeAgain = () => {
    setScanStep('camera');
    setMockAmount('');
    setMockRemark('');
    setMockPin('');
    setPinError('');
    successAnim.setValue(0);
  };

  // Sample data for contacts
  const contacts = [
    { name: 'Atharva Patil',  initial: 'A',color: '#8B5CF6' },
    { name: 'Kamlesh', initial: 'K' ,color: '#8B5CF6'},
    { name: 'Mr GANES...', initial: 'M', color: '#8B5CF6' },
    { name: 'Jiten Ishwa...', initial: 'J', color: '#06B6D4' },
    { name: 'Asim', initial: 'A', color: '#EC4899' },
    { name: 'HARSHIT', initial: 'H', color: '#059669' },
    { name: 'Anushka', initial: 'A', color: '#EA580C' },
  ];

  const handleButtonPress = (buttonName) => {
    Alert.alert('Button Pressed', `${buttonName} button was pressed`);
  };

  const handlePaymentAction = (action) => {
    if (action === 'Scan QR') {
      openScanQR();
    } else if (action === 'Pay Anyone') {
      openPayAnyone();
    } else if (action === 'Bank Transfer') {
      navigation.navigate('BankTransferScreen');
    } else if (action === 'Mobile Recharge') {
      navigation.navigate('MobileRechargeScreen');
    } else {
      Alert.alert('Payment Action', `${action} action initiated`);
    }
  };

  const renderMainScreenContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Businesses</Text>
        <Text style={styles.exploreText}>Explore</Text>
      </View>

      {/* App Icons */}
      <View style={styles.appIconsContainer}>
        <TouchableOpacity style={styles.appIcon} onPress={() => handleButtonPress('Google Cloud')}>
          <View style={styles.iconCircle}>
            <Icon name="cloud" size={24} color="#4285F4" />
          </View>
          <Text style={styles.appIconText}>Google Clo...</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.appIcon} onPress={() => handleButtonPress('Google Play')}>
          <View style={styles.iconCircle}>
            <Icon name="play-arrow" size={24} color="#34A853" />
          </View>
          <Text style={styles.appIconText}>Google Play</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.appIcon} onPress={() => handleButtonPress('MakeMy...')}>
          <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.iconLetter}>M</Text>
          </View>
          <Text style={styles.appIconText}>MAKEMYT...</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.appIcon} onPress={() => handleButtonPress('More')}>
          <View style={styles.moreIcon}>
            <Icon name="keyboard-arrow-down" size={24} color="#666" />
          </View>
          <Text style={styles.appIconText}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Offers & Rewards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offers & rewards</Text>
        <View style={styles.rewardsContainer}>
          <TouchableOpacity style={styles.rewardItem} onPress={() => handleButtonPress('Rewards')}>
            <View style={[styles.rewardIcon, { backgroundColor: '#F59E0B' }]}>
              <Icon name="stars" size={24} color="#FFF" />
            </View>
            <Text style={styles.rewardText}>Rewards</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.rewardItem} onPress={() => handleButtonPress('Offers')}>
            <View style={[styles.rewardIcon, { backgroundColor: '#EC4899' }]}>
              <Icon name="local-offer" size={24} color="#FFF" />
            </View>
            <Text style={styles.rewardText}>Offers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.rewardItem} onPress={() => handleButtonPress('Referrals')}>
            <View style={[styles.rewardIcon, { backgroundColor: '#3B82F6' }]}>
              <Icon name="people" size={24} color="#FFF" />
            </View>
            <Text style={styles.rewardText}>Referrals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loan Banner */}
      <View style={styles.loanBanner}>
        <View style={styles.loanContent}>
          <Text style={styles.loanTitle}>Loan amount in account,</Text>
          <Text style={styles.loanTitle}>in under 24 hrs</Text>
          <TouchableOpacity style={styles.applyButton} onPress={() => handleButtonPress('Apply Loan')}>
            <Text style={styles.applyButtonText}>Apply now</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loanIllustration}>
          <View style={styles.phoneIllustration}>
            <View style={styles.phoneScreen}>
              <View style={styles.greenBox} />
            </View>
            <View style={styles.floatingElements}>
              <View style={styles.rupeeIcon}>
                <Text style={styles.rupeeText}>₹</Text>
              </View>
              <View style={styles.houseIcon}>
                <Icon name="home" size={16} color="#FFF" />
              </View>
              <View style={styles.carIcon}>
                <Icon name="directions-car" size={16} color="#FFF" />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Manage Your Money */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage your money</Text>
        <View style={styles.moneyOptionsContainer}>
          <TouchableOpacity style={styles.moneyOption} onPress={() => handleButtonPress('Personal Loan')}>
            <Icon name="account-balance-wallet" size={32} color="#3B82F6" />
            <Text style={styles.moneyOptionTitle}>Personal loan</Text>
            <Text style={styles.moneyOptionSubtitle}>Up to ₹10 lakh, instant approval</Text>
            <TouchableOpacity style={styles.smallApplyButton} onPress={() => handleButtonPress('Apply Personal Loan')}>
              <Text style={styles.smallApplyButtonText}>Apply now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moneyOption} onPress={() => handleButtonPress('Credit Card')}>
            <Icon name="credit-card" size={32} color="#3B82F6" />
            <Text style={styles.moneyOptionTitle}>Credit card</Text>
            <Text style={styles.moneyOptionSubtitle}>Save up to ₹12,00</Text>
            <TouchableOpacity style={styles.smallApplyButton} onPress={() => handleButtonPress('Apply Credit Card')}>
              <Text style={styles.smallApplyButtonText}>Apply now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Options */}
      <View style={styles.accountOptions}>
        <TouchableOpacity style={styles.accountOption} onPress={() => handleButtonPress('Check CIBIL Score')}>
          <Icon name="assessment" size={24} color="#666" />
          <Text style={styles.accountOptionText}>Check your CIBIL score for free</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountOption} onPress={() => handleButtonPress('Transaction History')}>
          <Icon name="history" size={24} color="#666" />
          <Text style={styles.accountOptionText}>See transaction history</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountOption} onPress={() => handleButtonPress('Bank Balance')}>
          <Icon name="account-balance" size={24} color="#666" />
          <Text style={styles.accountOptionText}>Check bank balance</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Navigation Button */}
      {/* <TouchableOpacity 
        style={styles.navigationButton} 
        onPress={() => setCurrentScreen('payment')}
      >
        <Text style={styles.navigationButtonText}>Go to Payment Screen</Text>
      </TouchableOpacity> */}
    </>
  );

  const renderPaymentScreenContent = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {/* Back Button in search row */}
        <TouchableOpacity
          style={styles.inlineBackButton}
          onPress={() => navigation.goBack()}
        >
          <IonIcon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pay by name or phone number"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => handleButtonPress('Profile')}>
          <Text style={styles.profileButtonText}>V</Text>
        </TouchableOpacity>
      </View>

      {/* UPI Lite Banner */}
      <View style={styles.upiBanner}>
        <View style={styles.upiBannerContent}>
          <Text style={styles.upiBannerTitle}>Pay even when bank</Text>
          <Text style={styles.upiBannerTitle}>server is down</Text>
          <TouchableOpacity style={styles.upiLiteButton} onPress={() => handleButtonPress('UPI Lite')}>
            <Text style={styles.upiLiteButtonText}>Try UPI Lite</Text>
            <Icon name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.upiBannerIllustration}>
          <View style={styles.rocketContainer}>
            <Icon name="rocket-launch" size={40} color="#3B82F6" />
            <View style={styles.floatingCoins}>
              <View style={styles.coin}><Text style={{color:'#FFF',fontSize:12}}>₹</Text></View>
              <View style={styles.locationPin}><Text style={{fontSize:16}}>📍</Text></View>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => handlePaymentAction('Scan QR')}>
          <View style={styles.quickActionIcon}>
            <Icon name="qr-code-scanner" size={24} color="#FFF" />
          </View>
          <Text style={styles.quickActionText}>Scan any</Text>
          <Text style={styles.quickActionText}>QR code</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction} onPress={() => handlePaymentAction('Pay Anyone')}>
          <View style={styles.quickActionIcon}>
            <Icon name="person" size={24} color="#FFF" />
          </View>
          <Text style={styles.quickActionText}>Pay</Text>
          <Text style={styles.quickActionText}>anyone</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction} onPress={() => handlePaymentAction('Bank Transfer')}>
          <View style={styles.quickActionIcon}>
            <Icon name="account-balance" size={24} color="#FFF" />
          </View>
          <Text style={styles.quickActionText}>Bank</Text>
          <Text style={styles.quickActionText}>transfer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction} onPress={() => handlePaymentAction('Mobile Recharge')}>
          <View style={styles.quickActionIcon}>
            <Icon name="phone-android" size={24} color="#FFF" />
          </View>
          <Text style={styles.quickActionText}>Mobile</Text>
          <Text style={styles.quickActionText}>recharge</Text>
        </TouchableOpacity>
      </View>

      {/* UPI Options */}
      <View style={styles.upiOptions}>
        <TouchableOpacity style={styles.upiOption} onPress={() => handleButtonPress('Tap & Pay')}>
          <Icon name="tap-and-play" size={20} color="#666" />
          <Text style={styles.upiOptionText}>Tap & Pay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.upiOption, styles.activateUpiLite]} onPress={() => handleButtonPress('Activate UPI Lite')}>
          <Icon name="add-circle-outline" size={20} color="#666" />
          <Text style={styles.upiOptionText}>Activate UPI Lite</Text>
        </TouchableOpacity>
        
        <View style={styles.upiId}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.upiIdText}>UPI ID: kisanai@okhdfcbank</Text>
          </ScrollView>
        </View>
      </View>

      {/* People Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>People</Text>
        <View style={styles.peopleContainer}>
          {/* First row: 4 contacts */}
          {contacts.slice(0, 4).map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactItem}
              onPress={() => navigation.navigate('ContactUPIDetail', { contact })}
            >
              {typeof contact.avatar === 'number' ? (
                <View style={[styles.contactAvatar, { overflow: 'hidden', backgroundColor: 'transparent' }]}> 
                  <Image source={contact.avatar} style={{ width: 64, height: 64, borderRadius: 32 }} />
                </View>
              ) : (
                <View style={[
                  styles.contactAvatar,
                  { backgroundColor: contact.color || '#3B82F6' }
                ]}>
                  <Text style={styles.contactInitial}>{contact.initial}</Text>
                </View>
              )}
              <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
            </TouchableOpacity>
          ))}
          {/* Second row: 3 contacts + down arrow */}
          {contacts.slice(4, 7).map((contact, index) => (
            <TouchableOpacity
              key={4 + index}
              style={styles.contactItem}
              onPress={() => navigation.navigate('ContactUPIDetail', { contact })}
            >
              {typeof contact.avatar === 'number' ? (
                <View style={[styles.contactAvatar, { overflow: 'hidden', backgroundColor: 'transparent' }]}> 
                  <Image source={contact.avatar} style={{ width: 64, height: 64, borderRadius: 32 }} />
                </View>
              ) : (
                <View style={[
                  styles.contactAvatar,
                  { backgroundColor: contact.color || '#3B82F6' }
                ]}>
                  <Text style={styles.contactInitial}>{contact.initial}</Text>
                </View>
              )}
              <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
            </TouchableOpacity>
          ))}
          {/* Down arrow for more */}
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleButtonPress('Show More Contacts')}
          >
            <View style={[styles.contactAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}> 
              <Icon name="keyboard-arrow-down" size={32} color="#FFF" />
            </View>
            <Text style={styles.contactName} numberOfLines={1}>More</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bills & Recharges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bills & recharges</Text>
        <View style={styles.billsContainer}>
          <View style={styles.billsRow}>
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Jio Prepaid')}>
              <View style={[styles.billIcon, { backgroundColor: '#003F7F' }]}>
                <Text style={styles.billIconText}>Jio</Text>
              </View>
              <Text style={styles.billText}>Jio Prepaid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Mobile Recharge')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="phone-android" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>Mobile</Text>
              <Text style={styles.billText}>recharge</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('DTH/Cable')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="tv" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>DTH / Cable</Text>
              <Text style={styles.billText}>TV</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Electricity')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="lightbulb" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>Electricity</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.billsRow}>
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('LIC')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="security" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>LIC /</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Loan EMI')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="description" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>Loan EMI</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Postpaid')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="receipt" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>Postpaid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.billItem} onPress={() => handlePaymentAction('Credit Cards')}>
              <View style={[styles.billIcon, { backgroundColor: '#1E40AF' }]}>
                <Icon name="credit-card" size={20} color="#FFF" />
              </View>
              <Text style={styles.billText}>Credit cards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Navigation Button */}
      {/* <TouchableOpacity 
        style={styles.navigationButton} 
        onPress={() => setCurrentScreen('main')}
      >
        <Text style={styles.navigationButtonText}>Go to Main Screen</Text>
      </TouchableOpacity> */}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 46, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {renderPaymentScreenContent()}
        {renderMainScreenContent()}
      </ScrollView>
      {/* Mock Scan QR Modal */}
      <Modal
        visible={scanQRModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeScanQR}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            {/* Camera Step */}
            {scanStep === 'camera' && (
              <View style={styles.mockCameraContainer}>
                <Text style={styles.mockCameraTitle}>Scan QR Code</Text>
                <View style={styles.mockCameraFrame}>
                  <View style={styles.mockQR} />
                </View>
                <Text style={styles.mockCameraHint}>Align the QR code within the frame</Text>
                <TouchableOpacity style={styles.mockScanButton} onPress={handleFakeScan}>
                  <Text style={styles.mockScanButtonText}>Simulate Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mockCloseButton} onPress={closeScanQR}>
                  <Text style={styles.mockCloseButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Payment Form Step */}
            {scanStep === 'form' && (
              <View style={styles.mockFormContainer}>
                <Text style={styles.mockFormTitle}>Pay to</Text>
                <Text style={styles.mockFormRecipient}>{MOCK_RECIPIENT.name}</Text>
                <Text style={styles.mockFormUpi}>{MOCK_RECIPIENT.upi}</Text>
                <TextInput
                  style={styles.mockInput}
                  placeholder="Enter amount"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={mockAmount}
                  onChangeText={setMockAmount}
                />
                <TextInput
                  style={styles.mockInput}
                  placeholder="Add a remark (optional)"
                  placeholderTextColor="#888"
                  value={mockRemark}
                  onChangeText={setMockRemark}
                />
                <TouchableOpacity
                  style={[styles.mockPayButton, { opacity: mockAmount ? 1 : 0.5 }]}
                  onPress={handlePay}
                  disabled={!mockAmount}
                >
                  <Text style={styles.mockPayButtonText}>Pay ₹{mockAmount || '0'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mockBackButton} onPress={() => setScanStep('camera')}>
                  <Text style={styles.mockBackButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* PIN Step */}
            {scanStep === 'pin' && (
              <View style={styles.mockPinContainer}>
                <Text style={styles.mockPinTitle}>Enter UPI PIN</Text>
                <TextInput
                  style={styles.mockInput}
                  placeholder="Enter 4-digit PIN"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  secureTextEntry
                  value={mockPin}
                  onChangeText={setMockPin}
                  maxLength={4}
                />
                {pinError ? <Text style={styles.mockPinError}>{pinError}</Text> : null}
                <TouchableOpacity
                  style={[styles.mockPayButton, { opacity: mockPin.length === 4 ? 1 : 0.5 }]}
                  onPress={handlePinSubmit}
                  disabled={mockPin.length !== 4}
                >
                  <Text style={styles.mockPayButtonText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mockBackButton} onPress={() => setScanStep('form')}>
                  <Text style={styles.mockBackButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Success Step */}
            {scanStep === 'success' && (
              <View style={styles.mockSuccessContainer}>
                <Animated.View
                  style={[
                    styles.mockSuccessTick,
                    { transform: [{ scale: successAnim }] },
                  ]}
                >
                  <IonIcon name="checkmark-circle" size={80} color="#10B981" />
                </Animated.View>
                <Text style={styles.mockSuccessText}>Payment Successful!</Text>
                <Text style={styles.mockSuccessAmount}>₹{mockAmount} paid to {MOCK_RECIPIENT.name}</Text>
                <TouchableOpacity style={styles.mockPayButton} onPress={handlePracticeAgain}>
                  <Text style={styles.mockPayButtonText}>Practice Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mockCloseButton} onPress={closeScanQR}>
                  <Text style={styles.mockCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Mock Pay Anyone Modal */}
      {/* Removed Mock Pay Anyone Modal */}
    </SafeAreaView>
  );
};

// PayAnyoneScreen: full page for Pay Anyone flow
const PayAnyoneScreen = ({ navigation }) => {
  const [payAnyoneInput, setPayAnyoneInput] = useState('');
  const payAnyoneRecents = [
    { name: 'Anilkumar Saroj', phone: '+91 99308 04309', color: '#a21caf', initial: 'A' },
  ];
  const payAnyoneAll = [
    { type: 'self', name: 'Self transfer', desc: 'Transfer money between your accounts', color: '#2563eb', icon: 'person' },
    { type: 'group', name: 'New group', desc: 'Start group chat or split an expense', color: '#2563eb', icon: 'group-add' },
    { name: '5B30 viraj verma', phone: '+91 70214 51277', color: '#6366f1', initial: '5' },
    { name: 'Aadi Tendulkar', phone: '+91 99205 13049', color: '#64748b', initial: 'A', avatar: true },
  ];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.payAnyoneHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.payAnyoneBackBtn}>
          <IonIcon name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.payAnyoneTitle}>Pay anyone</Text>
      </View>
      <Text style={styles.payAnyoneSubtitle}>Pay any <Text style={{fontFamily:'monospace',fontWeight:'bold'}}>UPI</Text> app using name, number or UPI ID</Text>
      <View style={styles.payAnyoneInputRow}>
        <TextInput
          style={styles.payAnyoneInput}
          placeholder="Enter UPI ID or number"
          placeholderTextColor="#aaa"
          value={payAnyoneInput}
          onChangeText={setPayAnyoneInput}
        />
        <TouchableOpacity style={styles.payAnyoneInputBtn}>
          <Text style={styles.payAnyoneInputBtnText}>123</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.payAnyoneInputUserBtn}>
          <Icon name="person" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:24}}>
        <Text style={styles.payAnyoneSectionTitle}>Recents</Text>
        {payAnyoneRecents.map((item, i) => (
          <View key={i} style={styles.payAnyoneRecentRow}>
            <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
              <Text style={styles.payAnyoneAvatarText}>{item.initial}</Text>
            </View>
            <View>
              <Text style={styles.payAnyoneRecentName}>{item.name}</Text>
              <Text style={styles.payAnyoneRecentPhone}>{item.phone}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.payAnyoneSectionTitle}>All people on UPI</Text>
        {payAnyoneAll.map((item, i) => (
          item.type === 'self' ? (
            <View key={i} style={styles.payAnyoneAllRow}>
              <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                <Icon name="person" size={22} color="#FFF" />
              </View>
              <View>
                <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                <Text style={styles.payAnyoneAllDesc}>{item.desc}</Text>
              </View>
            </View>
          ) : item.type === 'group' ? (
            <View key={i} style={styles.payAnyoneAllRow}>
              <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                <Icon name="group-add" size={22} color="#FFF" />
              </View>
              <View>
                <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                <Text style={styles.payAnyoneAllDesc}>{item.desc}</Text>
              </View>
            </View>
          ) : (
            <View key={i} style={styles.payAnyoneAllRow}>
              <View style={[styles.payAnyoneAvatar, {backgroundColor: item.color}]}> 
                <Text style={styles.payAnyoneAvatarText}>{item.initial}</Text>
              </View>
              <View>
                <Text style={styles.payAnyoneAllName}>{item.name}</Text>
                <Text style={styles.payAnyoneRecentPhone}>{item.phone}</Text>
              </View>
            </View>
          )
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    // No flex: 1, no paddingTop
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  exploreText: {
    color: '#666',
    fontSize: 14,
  },
  appIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  appIcon: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconLetter: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  appIconText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardText: {
    color: '#FFF',
    fontSize: 12,
  },
  loanBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  loanContent: {
    flex: 1,
  },
  loanTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loanIllustration: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneIllustration: {
    width: 60,
    height: 80,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  phoneScreen: {
    width: 40,
    height: 60,
    backgroundColor: '#FFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenBox: {
    width: 20,
    height: 20,
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  floatingElements: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  rupeeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  rupeeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  houseIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 25,
    right: 15,
  },
  carIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    right: 5,
  },
  moneyOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moneyOption: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  moneyOptionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  moneyOptionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  smallApplyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  smallApplyButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  accountOptions: {
    marginBottom: 32,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  accountOptionText: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  inlineBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    minWidth: 0,
    maxWidth: '80%', // Make search bar less wide
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 8,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  upiBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  upiBannerContent: {
    flex: 1,
  },
  upiBannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  upiLiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  upiLiteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  upiBannerIllustration: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rocketContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCoins: {
    position: 'absolute',
  },
  coin: {
    position: 'absolute',
    top: -20,
    left: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  locationPin: {
    position: 'absolute',
    top: 20,
    right: -10,
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
  upiOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  upiOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  activateUpiLite: {
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  upiOptionText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  upiId: {
    flex: 1,
    paddingBottom: 20,
    marginTop: 16, // Added to shift UPI ID down for better alignment
  },
  upiIdText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  peopleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contactItem: {
    alignItems: 'center',
    width: '25%', // 4 in one line
    marginBottom: 16,
    paddingHorizontal: 8, // Add horizontal spacing
  },
  contactAvatar: {
    width: 54,
    height: 54,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactInitial: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactName: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
  billsContainer: {
    marginBottom: 16,
  },
  billsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  billItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  billIcon: {
    width: 54,
    height: 54,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  billIconText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  billText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 12,
  },
  navigationButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 24,
  },
  navigationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mockCameraContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mockCameraTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mockCameraFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#222',
  },
  mockQR: {
    width: 120,
    height: 120,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
  },
  mockCameraHint: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 24,
  },
  mockScanButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  mockScanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mockCloseButton: {
    marginTop: 8,
    padding: 8,
  },
  mockCloseButtonText: {
    color: '#F87171',
    fontSize: 16,
  },
  mockFormContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mockFormTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mockFormRecipient: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mockFormUpi: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 16,
  },
  mockInput: {
    width: '90%',
    backgroundColor: '#222',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  mockPayButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  mockPayButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mockBackButton: {
    marginTop: 8,
    padding: 8,
  },
  mockBackButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  mockPinContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mockPinTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mockPinError: {
    color: '#F87171',
    fontSize: 14,
    marginBottom: 8,
  },
  mockSuccessContainer: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 24,
  },
  mockSuccessTick: {
    marginBottom: 16,
  },
  mockSuccessText: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mockSuccessAmount: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 16,
  },
  payAnyoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#18181b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  payAnyoneBackBtn: {
    marginRight: 12,
    padding: 4,
  },
  payAnyoneTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  payAnyoneSubtitle: {
    color: '#aaa',
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  payAnyoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 8,
    height: 48,
  },
  payAnyoneInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  payAnyoneInputBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 6,
  },
  payAnyoneInputBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  payAnyoneInputUserBtn: {
    backgroundColor: '#444',
    borderRadius: 16,
    padding: 6,
    marginLeft: 2,
  },
  payAnyoneSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  payAnyoneRecentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  payAnyoneAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payAnyoneAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  payAnyoneRecentName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  payAnyoneRecentPhone: {
    color: '#aaa',
    fontSize: 13,
  },
  payAnyoneAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  payAnyoneAllName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  payAnyoneAllDesc: {
    color: '#aaa',
    fontSize: 13,
  },
});

export default UPIScreen;