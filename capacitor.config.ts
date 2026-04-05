import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;
const isHttp = typeof serverUrl === "string" && serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.cloudduty.app",
  appName: "CloudDuty",
  webDir: "out",
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: isHttp,
        },
      }
    : {}),
};

export default config;
