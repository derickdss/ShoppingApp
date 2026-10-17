import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./styles/App.styles";
import Home from "./components/Home";
import ListEditor from "./components/ListEditor";
import { ListsContext } from "./utils/ListsContext";
import useLists from "./utils/useLists";

const HEADER = {
  headerStyle: { backgroundColor: COLORS.header },
  headerTintColor: "#fff",
  headerTitleAlign: "center",
  headerTitleStyle: { fontWeight: "bold" },
};

export default function App() {
  const listsState = useLists();
  const Stack = createNativeStackNavigator();

  return (
    <ListsContext.Provider value={listsState}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={HEADER} initialRouteName="Home">
          <Stack.Screen name="Home" component={Home} options={{ title: "Shopping Lists" }} />
          <Stack.Screen
            name="ListEditor"
            component={ListEditor}
            options={{ title: "Edit List" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ListsContext.Provider>
  );
}
