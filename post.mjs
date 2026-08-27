import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { loadData, saveData } from './storage.mjs';
import { simulateSquad, getBestHost } from './matchmake.mjs';

const VALID_REGIONS = ['NA', 'EU', 'ASIA', 'OCE', 'SA', 'AF'];

// Text generation function (Moved from commands.mjs)
function generateBoardText(db) {
  let text = "Click **'Board'** below to register your IGN and Region in the cross-server LFG.\n\n";
  if (db.squads.length === 0) return text + "**Squad 1**\n*Empty*";
  
  db.squads.forEach((squad, index) => {
    text += `**Squad ${index + 1}**\n`;
    squad.forEach(member => { text += `• ${member.name} [${member.region}]\n`; });
    const emptySlots = 4 - squad.length;
    if (emptySlots > 0) text += `*...and ${emptySlots} open slot(s)*\n`;
    text += "\n";
  });
  return text;
}

// Sync function (Moved from commands.mjs)
async function syncGlobalMessages(client, db, interaction, text) {
  if (!db.activeCascade || !db.activeCascade.messages) return;

  const syncPromises = db.activeCascade.messages.map(async (msgData) => {
    if (msgData.messageId === interaction.message.id) return; 
    try {
      const channel = await client.channels.fetch(msgData.channelId).catch(() => null);
      if (channel) {
        const targetMsg = await channel.messages.fetch(msgData.messageId).catch(() => null);
        if (targetMsg) {
          const syncedEmbed = EmbedBuilder.from(targetMsg.embeds[0]).setDescription(text);
          await targetMsg.edit({ embeds: [syncedEmbed] });
        }
      }
    } catch (err) {}
  });

  await Promise.all(syncPromises);
}

export async function cleanupOldMessages(client, activeCascadeData) {
  if (!activeCascadeData || !activeCascadeData.messages) return;

  console.log("Cleaning up old cascade messages...");
  for (const msgData of activeCascadeData.messages) {
    try {
      const channel = await client.channels.fetch(msgData.channelId).catch(() => null);
      if (channel) {
        const targetMsg = await channel.messages.fetch(msgData.messageId).catch(() => null);
        if (targetMsg) {
          await targetMsg.delete();
        }
      }
    } catch (err) {
      console.error(`Failed to delete old message in channel ${msgData.channelId}`, err);
    }
  }

  let db = loadData();
  if (db.activeCascade && db.activeCascade.id === activeCascadeData.id) {
    db.activeCascade = null;
    db.squads = [];
    saveData(db);
  }
}

export function initBroadcaster(client, cascadeEvents) {
  cascadeEvents.on('newCascade', async (cascadeData) => {
    let db = loadData();
    const nowSecs = Math.floor(Date.now() / 1000);

    // Updated to standard array length check
    if (!db.servers || db.servers.length === 0) {
      console.warn("Broadcast aborted: No servers registered in database. Run /setup.");
      return;
    }

    if (db.activeCascade && cascadeData.id !== db.activeCascade.id) {
      await cleanupOldMessages(client, db.activeCascade);
    }

    // Updated to map through the array directly and use the correct property names
    const broadcastPromises = db.servers.map(async (serverConfig) => {
      const guildId = serverConfig.id;
      const targetChannel = serverConfig.channel;

      try {
        const channel = await client.channels.fetch(targetChannel).catch(err => {
          console.error(`Failed to fetch channel ${targetChannel} in guild ${guildId}:`, err.message);
          return null;
        });
        
        if (!channel) return null;

        const embed = new EmbedBuilder()
          .setTitle(`Mission: ${cascadeData.node}`)
          .setDescription("Click **'Board'** below to register your IGN and Region in the Global LFG.\n\n**Squad 1**\n*Empty*")
          .setColor(0x9b59b6)
          .setFooter({ text: "Cascade Level Cap LFG" });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('board')
              .setLabel('Board')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('leave')
              .setLabel('Leave')
              .setStyle(ButtonStyle.Danger),
          );

        const pingText = serverConfig.roleId ? `<@&${serverConfig.roleId}>\n` : "";
               
        const msg = await channel.send({
          content: `${pingText} Cascade up till <t:${cascadeData.expiry}:t>. Expires <t:${cascadeData.expiry}:R>.`,
          embeds: [embed],
          components: [row]
        }).catch(err => {
          console.error(`Missing permissions or failed to send in channel ${channel.name} (${channel.id}):`, err.message);
          throw err;
        });
       
        console.log(`Successfully posted LFG to ${channel.name}`);
        
        // Ensure channelId is saved for the sync/cleanup functions
        return { guildId, channelId: targetChannel, messageId: msg.id };
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(broadcastPromises);
    const postedMessages = results.filter(result => result !== null);

    db = loadData();
    db.activeCascade = {
      id: cascadeData.id,
      expiry: cascadeData.expiry,
      messages: postedMessages
    };
    db.squads = [];
    saveData(db);
  });

  cascadeEvents.on('cascadeExpired', async (cascadeData) => {
    await cleanupOldMessages(client, cascadeData);
  });
}

// New handler for Board/Leave functionality
export async function handleBoardingInteractions(interaction, client) {
  // Board button
  if (interaction.isButton() && interaction.customId === 'board') {
    const userId = interaction.user.id;
    let db = loadData();

    let existingName = "";
    let existingRegion = "";
    for (const squad of db.squads) {
      const member = squad.find(m => m.id === userId);
      if (member) { existingName = member.name; existingRegion = member.region || ""; break; }
    }

    const modal = new ModalBuilder()
      .setCustomId('ign_modal')
      .setTitle(existingName ? 'Update Info' : 'Join the Global LFG');

    const ignInput = new TextInputBuilder()
      .setCustomId('ign_input')
      .setLabel("What is your Warframe IGN?")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(24) 
      .setRequired(true);

    const regionInput = new TextInputBuilder()
      .setCustomId('region_input')
      .setLabel("Region? (Strict)")
      .setPlaceholder("Must be: NA, EU, ASIA, OCE, SA, or AF")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(4) 
      .setRequired(true);

    if (existingName) {
      ignInput.setValue(existingName);
      if (existingRegion) regionInput.setValue(existingRegion);
    }

    modal.addComponents(
      new ActionRowBuilder().addComponents(ignInput), 
      new ActionRowBuilder().addComponents(regionInput)
    );
    await interaction.showModal(modal);

    return;
  }

  // Leave button
  if (interaction.isButton() && interaction.customId === 'leave') {
    const userId = interaction.user.id;
    let db = loadData();
    let removed = false;

    for (let i = 0; i < db.squads.length; i++) {
      const memberIndex = db.squads[i].findIndex(m => m.id === userId);
      if (memberIndex !== -1) {
        db.squads[i].splice(memberIndex, 1); 
        if (db.squads[i].length === 0) db.squads.splice(i, 1); 
        removed = true;
        break;
      }
    }
    if (!removed) return interaction.reply({ content: "You aren't currently in any squads!", ephemeral: true });

    saveData(db);
    const text = generateBoardText(db);
    const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(text);
    await interaction.update({ embeds: [newEmbed] });
    await syncGlobalMessages(client, db, interaction, text);

    return;
  }
  
  // Modals for board
  if (interaction.isModalSubmit() && interaction.customId === 'ign_modal') {
    const ign = interaction.fields.getTextInputValue('ign_input');
    const rawRegion = interaction.fields.getTextInputValue('region_input');
    const region = rawRegion.toUpperCase().trim(); 
    const userId = interaction.user.id;
    
    if (!VALID_REGIONS.includes(region)) {
      return interaction.reply({ 
        content: `**Invalid Region.** You entered "${rawRegion}". Please click Board again and use exactly: **NA, EU, ASIA, OCE, SA, AF**.`, 
        ephemeral: true 
      });
    }
    
    let db = loadData();
    let userUpdated = false;
    let filledSquadIndex = -1; 

    for (let i = 0; i < db.squads.length; i++) {
      const memberIndex = db.squads[i].findIndex(m => m.id === userId);
      if (memberIndex !== -1) {
        db.squads[i][memberIndex].name = ign; 
        db.squads[i][memberIndex].region = region; 
        userUpdated = true;
        break;
      }
    }

    if (!userUpdated) {
      let placed = false;
      for (let i = 0; i < db.squads.length; i++) {
        if (db.squads[i].length < 4) { 
          const simulatedSquad = [...db.squads[i], { region: region }];
          
          if (simulateSquad(simulatedSquad)) {
            db.squads[i].push({ name: ign, id: userId, channelId: interaction.channelId, region: region }); 
            placed = true; 
            if (db.squads[i].length === 4) filledSquadIndex = i; 
            break; 
          }
        }
      }
      if (!placed) {
        db.squads.push([{ name: ign, id: userId, channelId: interaction.channelId, region: region }]); 
      }
      
      if (filledSquadIndex !== -1) {
        const fullSquad = db.squads[filledSquadIndex];
        const smartHost = getBestHost(fullSquad);
        
        const channelGroups = {};
        for (const member of fullSquad) {
          if (!channelGroups[member.channelId]) channelGroups[member.channelId] = [];
          channelGroups[member.channelId].push(member);
        }

        for (const [channelId, members] of Object.entries(channelGroups)) {
          try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) {
              const pings = members.map(m => `<@${m.id}>`).join(' ');
              await channel.send(`**Squad Filled!**\n${pings}\n**${smartHost.name}** [${smartHost.region}] is the optimal host. Please expect an invite or \`/w\` them in-game.`);
            }
          } catch (err) {}
        }
      }
    }
    
    saveData(db);
    const text = generateBoardText(db);
    const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(text);
    await interaction.update({ embeds: [newEmbed] });
    await syncGlobalMessages(client, db, interaction, text);

    return;
  }
}
