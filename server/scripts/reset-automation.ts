import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

async function reset() {
  if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
  }

  const db = admin.firestore();
  await db.collection("automation_status").doc("current").set({
    isAutomating: false,
    message: "Sistema reiniciado e pronto.",
    progress: 0,
    stopRequested: false,
    updatedAt: new Date().toISOString()
  });
  console.log("Status do robô resetado com sucesso!");
  process.exit(0);
}

reset();
