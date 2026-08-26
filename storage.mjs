// In-memory temporary database
let memoryDb = {
  activeCascade: null,
  squads: []
};

export function loadData() {
  // Pull servers from Northflank and parse them into an array
  const rawWhitelist = process.env.WHITELISTED_SERVERS || "";
  const whitelistedServers = rawWhitelist.split(',').map(id => id.trim()).filter(id => id);

  return {
    ...memoryDb,
    servers: whitelistedServers // Inject environment variable servers here
  };
}

export function saveData(newData) {
  // Update the temporary in-memory state
  if (newData.activeCascade !== undefined) {
    memoryDb.activeCascade = newData.activeCascade;
  }
  if (newData.squads !== undefined) {
    memoryDb.squads = newData.squads;
  }
  // Note: We don't save 'servers' here because they are managed via your Cloud Service Providers Environment Variables
}

export function addGuildToWhitelist(guildId) {
  console.log("Notice: Whitelist command is disabled. Managed via Environment Variables.");
  return false; 
}

export function removeGuildFromWhitelist(guildId) {
  console.log("Notice: Whitelist command is disabled. Managed via Environment Variables.");
  return false;
}
