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
  
  // Animation values
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationBoxAnim = useRef(new Animated.Value(0)).current;

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

      // Start location animation after 0.2 seconds (much faster)
      setTimeout(() => {
        animateToUserLocation(location.coords);
      }, 200);

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
      }, 800); // Faster zoom animation
    }

    // Start location box animation
    setTimeout(() => {
      Animated.timing(locationBoxAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Navigate to Login screen after 5 seconds of showing location
    setTimeout(() => {
      navigation.replace('LoginScreen');
    }, 5000);
  };

  // Pulse animation for location box
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  // Get user location after component mounts
  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Satellite Map View */}
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
        mapType="satellite"
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

      {/* Improved Location Box Overlay */}
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
            colors={['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.95)']}
            style={styles.locationBoxGradient}
          >
            <View style={styles.locationIconContainer}>
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationBoxText}>Your Location</Text>
              <Text style={styles.locationSubText}>GPS coordinates detected</Text>
            </View>
            <View style={styles.locationStatus}>
              <View style={styles.statusDot} />
            </View>
          </LinearGradient>
        </Animated.View>
      )}
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
    top: height * 0.35,
    left: width * 0.5 - 80,
    zIndex: 1000,
  },
  locationBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 8,
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationBoxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  locationSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
  locationStatus: {
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default FetchingLocationScreen; 