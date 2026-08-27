import { saveServerConfig } from './storage.mjs';

export async function handleInteraction(interaction, client) {
  // Setup command
  if (interaction.commandName === 'setup') {
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role'); // This can be null

  // Send the IDs to MongoDB
  await saveServerConfig(
    interaction.guildId,
    channel.id,
    role ? role.id : null
  );

  await interaction.reply({ 
    content: `Setup complete! I will post Cascade LFG boards in <#${channel.id}>.`, 
    ephemeral: true 
  });
}

  // Guide Command
  if (interaction.isChatInputCommand() && interaction.commandName === 'guide') {
    const message1 = `**Cephalon Slowbot: Void Cascade LFG Guide**\nThanks for inviting Cephalon Slowbot into your server! If you'd like to make use of this cross-server LFG, please take note of these three requests.`;
    const message2 = `**1. Transparency:**If this is your first level cap, or you're unsure of how cascade works, please make sure your squadmates are aware of this. Our communities are built on helpfulness, not elitism. To an experienced cascader, teaching a person how to cascade is a pleasure! Conversely, nothing annoys an experienced cascader more than people being dishonest about their competence, only for the squad to find out about it once you hit exoliser 65 when the difficulty starts to ramp up. Ask questions! We're here to answer them! `;
    const message3 = `**2. Gearing:**Please don't register for a cascade if you aren't in a position to contribute to your team. Please make sure you have an amp good enough for cascade. Amp parts, arcanes, focus schools and tauron strikes, mods and arcanes can all make enormous difference to whether you're geared enough. It's a sliding scale, so if you don't know whether your operator's ready that's what the text channels in this discord are for. Again, ask questions! If you're not the social type (or even if you are), I highly recommend checking out [GreatBardini's Portal](<https://warframe.training/Level+Cap+Cascade/Level+Cap+Void+Cascade+(LCC)>), in which he breaks down the basics of a cascade and has extremely comfy builds you can try out if you're unsure about things like your frame and weapon choices. If you want to go way more in-depth than you'd need to, you can check out [MrSlowboat's Cascade Guide](<https://github.com/MrSlowboat/cephalon-slowbot-discord/blob/main/MrSlowboats_Cascade_Guide.pdf>).`;
    const message4 = `**3. Signing Up:**To sign up for a cascade, press the **Board** button, put in your IGN and region. Make sure you format the region exactly as 'NA' (North America), 'SA' (South America), 'EU' (Europe), 'ASIA', 'OCE' (Oceania), or 'AF' (Africa). The bot needs these written exactly as they are here for its matchmaking matrix to identify an ideal host based on global network topology. If you need to edit your IGN or region because of a typo, just press **Board** again. If you'd like to leave, well, press the button. Please ensure that if you sign up for a cascade, you have at least an hour and a half of time to spare so you can get to level cap. IRL stuff can always come up and force you to leave early, but please don't take your squadmates' time for granted. In case a group forms too slowly and you have other commitments, make sure you exit the LFG.`;
    const message5 = `**The Open Source Project:** If you'd like to find out more about how the bot works, track its progress, contribute to it or create your own version, you can find out more about the project here: [GitHub Repository](<https://github.com/MrSlowboat/cephalon-slowbot-discord>)`;

    await interaction.reply({ content: "Posting the guide to the channel...", ephemeral: true });

    try {
      const channel = interaction.channel;
      if (!channel) throw new Error("Channel not found.");

      await channel.send(message1);
      await channel.send(message2);
      await channel.send(message3);
      await channel.send(message4);
      await channel.send(message5);
    } catch (error) {
      console.error("Failed to send guide messages:", error);
      await interaction.followUp({ content: "I couldn't post the guide. Please check my permissions in this channel!", ephemeral: true });
    }
    
    return;
  }
}
