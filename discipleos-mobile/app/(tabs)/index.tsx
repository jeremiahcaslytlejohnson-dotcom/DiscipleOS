import { Text, View, Button, Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect, useState } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Home() {
  const [token, setToken] = useState<string | null>(null);

  async function registerForPushNotifications() {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Web push setup is not used here.");
        return;
      }

      if (!Device.isDevice) {
        Alert.alert("Must use physical device");
        return;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert("Permission not granted");
        return;
      }

      const projectId = "a1b73503-d795-44d6-b149-8466ed2556ea";

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log("EXPO PUSH TOKEN:", pushToken.data);
      setToken(pushToken.data);

      const response = await fetch("https://discipleos.app/api/mobile/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: pushToken.data,
          platform: "android",
        }),
      });

      const text = await response.text();
      Alert.alert("Register response", `${response.status}: ${text}`);
    } catch (error: any) {
      console.error("REGISTER ERROR:", error);
      Alert.alert("Register error", error?.message || "Unknown error");
    }
  }

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
      }}
    >
      <Text>DiscipleOS Mobile</Text>
      <Button title="Get Token Again" onPress={registerForPushNotifications} />
      {token && <Text selectable>{token}</Text>}
    </View>
  );
}