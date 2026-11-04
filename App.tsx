
import {AppNavigator} from '../citypassexpo/src/navigation/AppNavigation';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';


export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppNavigator />
      </UserProvider>
    </AuthProvider>
  );
}