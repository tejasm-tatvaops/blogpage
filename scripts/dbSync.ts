import dns from "node:dns";
import { MongoClient, type Collection, type Document } from "mongodb";

if (process.platform === "win32") {
  const custom = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  dns.setServers(custom?.length ? custom : ["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
}

const BATCH_SIZE = 500;
const SYSTEM_COLLECTION_PREFIX = "system.";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Set it in .env.local (see .env.example).`);
  }
  return value;
}

function clusterHost(uri: string): string {
  try {
    const normalized = uri.replace(/^mongodb\+srv:\/\//, "https://").replace(/^mongodb:\/\//, "http://");
    return new URL(normalized).hostname;
  } catch {
    return "(unknown host)";
  }
}

async function copyCollection(
  source: Collection<Document>,
  target: Collection<Document>,
): Promise<number> {
  await target.deleteMany({});

  let copied = 0;
  const batch: Document[] = [];
  const cursor = source.find({});

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      await target.insertMany(batch, { ordered: false });
      copied += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await target.insertMany(batch, { ordered: false });
    copied += batch.length;
  }

  return copied;
}

async function copyIndexes(
  source: Collection<Document>,
  target: Collection<Document>,
): Promise<number> {
  const indexes = await source.indexes();
  let created = 0;

  for (const index of indexes) {
    if (index.name === "_id_") continue;

    const { key, v: _v, ns: _ns, ...options } = index;
    await target.createIndex(key, options);
    created += 1;
  }

  return created;
}

async function run(): Promise<void> {
  const confirm = process.argv.includes("--confirm");
  const dryRun = process.argv.includes("--dry-run");

  const sourceUri = requireEnv("MONGODB_SOURCE_URI");
  const targetUri = requireEnv("MONGODB_URI");

  if (sourceUri === targetUri) {
    throw new Error("MONGODB_SOURCE_URI and MONGODB_URI must not be the same.");
  }

  const sourceHost = clusterHost(sourceUri);
  const targetHost = clusterHost(targetUri);

  console.log("Database sync");
  console.log(`  Source (read):  ${sourceHost}`);
  console.log(`  Target (write): ${targetHost}`);
  console.log(`  Mode: ${dryRun ? "dry-run" : confirm ? "copy" : "preview"}`);

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db();
  const targetDb = targetClient.db();

  const collections = (await sourceDb.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith(SYSTEM_COLLECTION_PREFIX))
    .sort();

  if (collections.length === 0) {
    console.log("No collections found on source database.");
    await sourceClient.close();
    await targetClient.close();
    return;
  }

  const plan: { collection: string; sourceCount: number }[] = [];

  for (const name of collections) {
    const count = await sourceDb.collection(name).countDocuments();
    plan.push({ collection: name, sourceCount: count });
  }

  console.log("\nCollections to sync:");
  for (const row of plan) {
    console.log(`  ${row.collection}: ${row.sourceCount} documents`);
  }

  const totalDocs = plan.reduce((sum, row) => sum + row.sourceCount, 0);
  console.log(`\nTotal: ${totalDocs} documents across ${plan.length} collections`);

  if (dryRun || !confirm) {
    if (!confirm && !dryRun) {
      console.log("\nPreview only. Re-run with --confirm to copy data to the target cluster.");
    }
    await sourceClient.close();
    await targetClient.close();
    return;
  }

  console.log("\nCopying...");

  for (const name of collections) {
    const sourceCol = sourceDb.collection(name);
    const targetCol = targetDb.collection(name);
    const copied = await copyCollection(sourceCol, targetCol);
    const indexes = await copyIndexes(sourceCol, targetCol);
    console.log(`  ${name}: ${copied} docs, ${indexes} indexes`);
  }

  console.log("\nSync complete. Restart the dev server if it is running.");
  await sourceClient.close();
  await targetClient.close();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
