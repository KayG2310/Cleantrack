import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import DashboardStudentScreen from "../screens/DashboardStudentScreen";
import AllTicketsScreen from "../screens/AllTicketsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator({ isLoggedIn, setIsLoggedIn, role }) {
    const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";

    return (
      <NavigationContainer>
        <Stack.Navigator>
          {isLoggedIn ? (
            normalizedRole === "student" ? (
              <>
              <Stack.Screen name="CleanTrack">
                {(props) => (
                  <DashboardStudentScreen {...props} setIsLoggedIn={setIsLoggedIn} />
                )}
              </Stack.Screen>
              <Stack.Screen 
                name="AllTicketsScreen" 
                component={AllTicketsScreen}
                options={{ headerShown: false }}
              />
              </>
            ) : (
              <Stack.Screen name="DashboardStudent">
                {(props) => (
                  <DashboardStudentScreen {...props} setIsLoggedIn={setIsLoggedIn} />
                )}
              </Stack.Screen>
            )
          ) : (
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }