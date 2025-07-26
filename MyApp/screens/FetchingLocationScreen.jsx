import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FetchingLocationScreen = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [boundingBox, setBoundingBox] = useState(null);
  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  
  // Animation values
  const mapRef = useRef(null);
  const boundingBoxAnim = useRef(new Animated.Value(0)).current;

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
      }, 1500); // Moderate zoom animation
    }

    // Start point selection after showing location
    setTimeout(() => {
      startPointSelection();
    }, 3000);
  };

  // Start point selection process
  const startPointSelection = () => {
    setIsSelectingPoints(true);
    setSelectedPoints([]);
    setBoundingBox(null);
  };

  // Handle map press to add points
  const handleMapPress = (event) => {
    if (!isSelectingPoints || selectedPoints.length >= 4) return;

    const newPoint = {
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
      id: selectedPoints.length + 1,
    };

    const updatedPoints = [...selectedPoints, newPoint];
    setSelectedPoints(updatedPoints);

    // If 4 points are selected, create bounding box
    if (updatedPoints.length === 4) {
      createBoundingBox(updatedPoints);
    }
  };

  // Create bounding box from 4 points
  const createBoundingBox = (points) => {
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const boundingBoxCoords = [
      { latitude: minLat, longitude: minLng },
      { latitude: minLat, longitude: maxLng },
      { latitude: maxLat, longitude: maxLng },
      { latitude: maxLat, longitude: minLng },
    ];

    setBoundingBox(boundingBoxCoords);
    setIsSelectingPoints(false);

    // Animate bounding box appearance
    Animated.timing(boundingBoxAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Wait 5 seconds then proceed
    setTimeout(() => {
      navigation.replace('LoginScreen');
    }, 5000);
  };

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
        onPress={handleMapPress}
      >
        {/* Selected points markers */}
        {selectedPoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={point}
            title={`Point ${point.id}`}
          >
            <View style={styles.pointMarker}>
              <Text style={styles.pointNumber}>{point.id}</Text>
            </View>
          </Marker>
        ))}

        {/* Bounding box polygon */}
        {boundingBox && (
          <Polygon
            coordinates={boundingBox}
            fillColor="rgba(16, 185, 129, 0.3)"
            strokeColor="rgba(16, 185, 129, 0.8)"
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Point Selection Instructions */}
      {isSelectingPoints && (
        <Animated.View
          style={[
            styles.instructionsBox,
            {
              opacity: boundingBoxAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.8)']}
            style={styles.instructionsGradient}
          >
            <Ionicons name="hand-left" size={24} color="#FFFFFF" />
            <Text style={styles.instructionsText}>
              Tap 4 points on the map to create your farm boundary
            </Text>
            <Text style={styles.pointsText}>
              {selectedPoints.length}/4 points selected
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Bounding Box Created Message */}
      {boundingBox && (
        <Animated.View
          style={[
            styles.boundingBoxMessage,
            {
              opacity: boundingBoxAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.95)']}
            style={styles.boundingBoxGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.boundingBoxText}>Farm boundary created!</Text>
            <Text style={styles.boundingBoxSubText}>Proceeding in 5 seconds...</Text>
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
  pointMarker: {
    backgroundColor: '#10B981',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pointNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionsBox: {
    position: 'absolute',
    top: height * 0.1,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  instructionsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  pointsText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  boundingBoxMessage: {
    position: 'absolute',
    bottom: height * 0.2,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  boundingBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boundingBoxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  boundingBoxSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
});

export default FetchingLocationScreen; 