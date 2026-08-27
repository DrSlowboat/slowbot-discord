import { MongoClient } from 'mongodb';

// Temporary RAM for active LFGs
let memoryDb = {
  activeCascade: null,
  squads: [],
  servers: [] // Fetched from MongoDB on boot
};

let dbClient = null;
let serversCollection = null;

// Connect to MongoDB on startup
export async function initDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("CRITICAL: MONGO_URI environment variable is missing!");
    return;
  }
  
  dbClient = new MongoClient(uri);
  await dbClient.connect();
  const database = dbClient.db('slowbot');
  serversCollection = database.collection('servers');

  // Load saved channels into fast memory
  const savedServers = await serversCollection.find({}).toArray();
  memoryDb.servers = savedServers.map(s => ({
    id: s.guildId,
    channel: s.channelId,
    roleId: s.roleId
  }));
  console.log(`Successfully loaded ${memoryDb.servers.length} server configs from MongoDB.`);
}

export function loadData() {
  return memoryDb;
}

export function saveData(newData) {
  if (newData.activeCascade !== undefined) memoryDb.activeCascade = newData.activeCascade;
  if (newData.squads !== undefined) memoryDb.squads = newData.squads;
}

// Write new /setup configurations to MongoDB
export async function saveServerConfig(guildId, channelId, roleId) {
  if (!serversCollection) return;
  
  // 1. Save to cloud database
  await serversCollection.updateOne(
    { guildId: guildId },
    { $set: { guildId, channelId, roleId } },
    { upsert: true }
  );

  // 2. Update local memory immediately
  const existing = memoryDb.servers.find(s => s.id === guildId);
  if (existing) {
    existing.channel = channelId;
    existing.roleId = roleId;
  } else {
    memoryDb.servers.push({ id: guildId, channel: channelId, roleId });
  }
}

