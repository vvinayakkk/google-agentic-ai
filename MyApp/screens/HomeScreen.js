import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar 
} from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Home Screen</Text>
        <Text style={styles.subtitle}>This is your active screen</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Active Button</Text>
        </TouchableOpacity>
        
        {/* Commented out navigation to Profile */}
        {/* <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </TouchableOpacity> */}
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Build your UI components here!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
  },
});

export default HomeScreen;