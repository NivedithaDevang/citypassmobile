import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Ionicons from '@react-native-vector-icons/ionicons'
import axios from 'axios'
export default function Header() {
  return (
    <>
    <SafeAreaProvider style={styles.container} />
    <StatusBar style="light" />
    
     {/* Top Navbar */}
      <View style={styles.navbar}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.localImage}
        />
        <Text style={styles.heading}>Citypass</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>
    
    
    </>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e0025'
    },
    navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 27,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  localImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },

  heading: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})