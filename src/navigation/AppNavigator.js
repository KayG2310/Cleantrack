import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import DashboardStudentScreen from "../screens/DashboardStudentScreen";
import AllTicketsScreen from "../screens/AllTicketsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator({ isLoggedIn, setIsLoggedIn, role }) {
    return (
      <NavigationContainer>
        <Stack.Navigator>
          {isLoggedIn ? (
            role === "student" ? (
              <>
              <Stack.Screen name="DashboardStudent">
                {(props) => (
                  <DashboardStudentScreen {...props} setIsLoggedIn={setIsLoggedIn} />
                )}
              </Stack.Screen>
              <Stack.Screen 
                name="AllTickets" 
                component={AllTicketsScreen}
                options={{ headerShown: false }}
              />
              </>
            ) : (
              <Stack.Screen name="DashboardCaretaker">
                {(props) => (
                  <DashboardCaretakerScreen {...props} setIsLoggedIn={setIsLoggedIn} />
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