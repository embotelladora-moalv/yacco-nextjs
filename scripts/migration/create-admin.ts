// scripts/migration/create-admin.ts — uso único, no commitear
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const SA_PATH =
  process.env.NEW_SA_PATH ||
  path.resolve(HOME, "Desktop/claude-staging/keys/new-service-account.json");

const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const UID = "uMC7nf1oSZf3zEMD8mH7Y827dt73";

async function run() {
  const authUser = await admin.auth().getUser(UID);
  const email = authUser.email ?? "";
  console.log(`Email en Firebase Auth: ${email}`);

  await Promise.all([
    admin.firestore().collection("users").doc(UID).set({
      name: "Admin Moalv",
      email,
      roles: ["ADMIN"],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
    admin.auth().setCustomUserClaims(UID, { roles: ["ADMIN"] }),
  ]);

  console.log(`✅ Admin creado`);
  console.log(`   UID  : ${UID}`);
  console.log(`   Email: ${email}`);
  console.log(`   Firestore /users/${UID} ✓`);
  console.log(`   Custom claims { roles: ["ADMIN"] } ✓`);
  process.exit(0);
}

run().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
