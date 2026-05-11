export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-for-local-dev-1234567890",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || process.env.OPENAI_API_KEY || "AIzaSyB9vVTbB-5bL8Bp4XqrU9kByb72Qe133cQ",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@tisgo.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "123456",
  firebase: {
    apiKey: "AIzaSyAeTqVqJ8JUfWd5KIXcy0Fu80hTK9xDvEU",
    authDomain: "tisggo-news.firebaseapp.com",
    projectId: "tisggo-news",
    storageBucket: "tisggo-news.firebasestorage.app",
    messagingSenderId: "700029482147",
    appId: "1:700029482147:web:87bc624fe027247ec93b16",
  }
};
