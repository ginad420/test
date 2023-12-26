import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import ServersData from '../../Servers/data.js';
import TicketsData from './data.js';

const ticketToolEmbed = (stringId) => {
    let numericId = ServersData.nameToIdMapping[stringId];
    var embed = new EmbedBuilder()
        .setColor(0xEFEFE5)
        .setTitle(`🗒 SKG Tickets Tool 🗒`)
        .setDescription('Welcome to the Tickets Tool.  \n\n**Please click one of the buttons below to open a ticket.**');

    var row = new ActionRowBuilder();

    TicketsData.serverButtons[numericId].forEach(buttonName => {
        console.log(buttonName);
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(buttonName)
                .setLabel(TicketsData.buttonData[numericId][buttonName].label)
                .setStyle(TicketsData.buttonData[numericId][buttonName].buttonStyle)
        );
    });

    return {
        embeds: [embed],
        components: [row]
    };
}

const welcomeToTicketEmbed = (type, interaction) => {

    let emoji = TicketsData.leadingEmoji[type];
	const embed = new EmbedBuilder()
		.setColor('#EFEFE5')
		.setDescription(`Thank you for creating a **${emoji} ${type} ${emoji}** ticket.  Support will be with you shortly.\nTo close this ticket, press the button below.`);
	
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`tickets_close`)
				.setLabel('🔒 Close Ticket')
				.setStyle(ButtonStyle.Secondary),
		);

	return {
        embeds: [embed], 
        components: [row], 
        content: `**Hey there, ${interaction.member.user}.**`
    };
}

export default {
    ticketToolEmbed,
    welcomeToTicketEmbed
}