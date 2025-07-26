import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FetchingLocationScreen = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values
  const mapRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationBoxAnim = useRef(new Animated.Value(0)).current;

  // Loading steps
  const loadingSteps = [
    'Fetching your location...',
    'Analyzing local mandis...',
    'Getting current prices...',
    'Fetching latest weather...',
    'Checking soil conditions...',
    'Setting up your dashboard...'
  ];

  // India center coordinates
  const INDIA_CENTER = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 40,
    longitudeDelta: 40,
  };

  // Get user location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to provide local services.');
        // Continue with fallback location
        setUserLocation({
          latitude: 19.0760, // Mumbai
          longitude: 72.8777,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        startLocationAnimation();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Start location animation after 2 seconds
      setTimeout(() => {
        animateToUserLocation(location.coords);
      }, 2000);

    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to a default location in India
      setUserLocation({
        latitude: 19.0760, // Mumbai
        longitude: 72.8777,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      startLocationAnimation();
    }
  };

  // Animate map to user location
  const animateToUserLocation = (coords) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 2000);
    }

    // Start location box animation
    setTimeout(() => {
      Animated.timing(locationBoxAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Start loading steps
    setTimeout(() => {
      startLoadingSteps();
    }, 2000);
  };

  // Start loading steps animation
  const startLoadingSteps = () => {
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          // Navigate to Login screen after all steps
          setTimeout(() => {
            navigation.replace('LoginScreen');
          }, 1000);
          return prev;
        }
      });
    }, 1500);
  };

  // Pulse animation for location box
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  // Initial animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Get user location after component mounts
    getUserLocation();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Simple Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INDIA_CENTER}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        showsIndoors={false}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={false}
        mapType="standard"
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            description="Approximate location"
          >
            <View style={styles.customMarker}>
              <Ionicons name="location" size={24} color="#10B981" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Location Box Overlay */}
      {userLocation && (
        <Animated.View
          style={[
            styles.locationBox,
            {
              opacity: locationBoxAnim,
              transform: [
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)']}
            style={styles.locationBoxGradient}
          >
            <Ionicons name="location" size={20} color="#FFFFFF" />
            <Text style={styles.locationBoxText}>Your Location</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Loading Overlay */}
      <Animated.View
        style={[
          styles.loadingOverlay,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)']}
          style={styles.loadingGradient}
        >
          {/* App Logo/Title */}
          <View style={styles.appTitleContainer}>
            <Text style={styles.appTitle}>🌾 Kisan Ki Awaaz</Text>
            <Text style={styles.appSubtitle}>Smart Farming Assistant</Text>
          </View>

          {/* Loading Steps */}
          <View style={styles.loadingStepsContainer}>
            {loadingSteps.map((step, index) => (
              <View key={index} style={styles.loadingStep}>
                <View style={styles.stepIconContainer}>
                  {index <= loadingStep ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#10B981"
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={24}
                      color="#64748B"
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    index <= loadingStep && styles.stepTextActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationBox: {
    position: 'absolute',
    top: height * 0.4,
    left: width * 0.5 - 60,
    zIndex: 1000,
  },
  locationBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationBoxText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
  },
  loadingGradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  appTitleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  loadingStepsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    fontSize: 16,
    color: '#64748B',
    flex: 1,
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    marginRight: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    minWidth: 40,
  },
});

export default FetchingLocationScreen; 