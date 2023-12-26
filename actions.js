import { PermissionsBitField, ChannelType, ActionRowBuilder } from 'discord.js';
import { ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import ServersData from '../../Servers/data.js';
import TicketsData from './data.js';
import Embeds from './embeds.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

const formattedNumber = (num) => {
    var res = num % 10000;
    let numTrailingZeros = 3 - Math.floor(Math.log(res) / Math.log(10));

    for (let i = 0; i < numTrailingZeros; i++) {
        res = `0${res}`;
    }

    return res;
}

const newTicketChannel = async (stringId, db, type, interaction) => {
    
    let numericId = ServersData.nameToIdMapping[stringId];

    let tags = await db.findAll(
        { 
            where: {
                openerId: interaction.member.user.id,
                type: type
            }
        }
    );

    var needToCreate = true;
    var openChannelId = null;

    if (tags) {
        for (const tag of tags) {
            if (!tag.closed) {
                needToCreate = false;
                openChannelId = tag.channelId;
                break;
            }
        }
    }
    
    if (needToCreate) {
        try {
            let tag = await db.create({
                type: type,
                openerId: interaction.member.user.id,
                closed: false,
                channelId: ""
            });

            var permOverwrites = [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.member.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    deny: [PermissionsBitField.Flags.CreateInstantInvite]
                }
            ];

            for (const roleId of TicketsData.viewAllowedRoleIds[numericId]) {
                permOverwrites.push(
                    {
                        id: roleId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        deny: [PermissionsBitField.Flags.CreateInstantInvite]
                    }
                );
            }

            let newChannel = await interaction.guild.channels.create({
                name: `${type}-${formattedNumber(tag.id)}`, 
                type: ChannelType.GuildText,
                permissionOverwrites: permOverwrites
            })
                .catch(async (e) => {
                    const rowCount = await db.destroy({ where: { id: tag.id } });
                    console.log(`TICKETS: ERROR: error in creating ticket channel for ${interaction.member.user.username}: ${e}`);
                    console.log(`TICKETS: deleted ${rowCount} rows in the database.`);
            });

            console.log(`TICKETS: ticket channel ${newChannel.name} created with id ${newChannel.id}.`);

            const affectedRows = await db.update(
                { 
                    channelId: newChannel.id 
                },
                { 
                    where: {
                         id: tag.id 
                    } 
                }
            );

            if (affectedRows > 0) {
                console.log(`TICKETS: db entry for ticket channel ${newChannel.name} (id=${tag.id}) updated channelId to ${newChannel.id}.`);
            } else {
                console.log(`TICKETS: db entry not found for ticket channel ${newChannel.name} (id=${tag.id}).`);
            }

            return [newChannel.id, true];

        } catch (e) {
            console.log(`TICKETS: ERROR: error creating new channel: ${e}`);
            return null;
        }

    } else {
        return [openChannelId, false];
    }
}

const buttonInteractions = async (interaction, stringId, db) => {

    let buttonId = interaction.customId;
    if (!buttonId.includes('tickets')) return;

    let numericId = ServersData.nameToIdMapping[stringId];

    if (buttonId.includes('start')) {
        
        let type = buttonId.split('_')[buttonId.split('_').length - 1];

        let result = await newTicketChannel(stringId, db, type, interaction);

        if (!result) {
            return await interaction.reply({
                ephemeral: true,
                content: "Hmm, there's an error creating a new ticket."
            })
                .catch((e) => console.log(`ERROR: error in sending reply: ${e}`));
        }

        const channelId = result[0];
        const isNewChannel = result[1];
        
        if (isNewChannel) {

            const channel = interaction.guild.channels.cache.find(channel => channel.id == channelId);

            await channel
                .send(Embeds.welcomeToTicketEmbed(type, interaction))
                .catch((e) => {
                    console.log(`TICKETS: ERROR: failed to send message in <#${channelId}> to ${interaction.member.user.username}: ${e}`);
                });
                
            return await interaction.reply({
                content:  `I've created your ticket channel at <#${channelId}>. Check that channel to gain support.`, 
                ephemeral: true 
            })
                .catch((e) => {
                    console.log(`TICKETS: ERROR: error replying to interaction for create_ticket: ${e}`);
                    return;
                });

        } else {
            return await interaction.reply({
                ephemeral: true,
                content: `❌ There's already an **open ticket channel** at <#${channelId}>. ❌`
            })
                .catch((e) => console.log(`ERROR: error in sending reply: ${e}`));
        }
    } else if (buttonId == 'tickets_close') {

        const tag = await db.findOne({ where: { channelId: interaction.channel.id } });
        
        if (tag.closed) {
            return interaction.reply({
                content: '❌ This ticket has already been closed. ❌',
                ephemeral: true
            })
                .catch((e) => console.log(`ERROR: error in sending reply: ${e}`));;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`tickets_yes_close`)
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`tickets_no_close`)
                    .setLabel('No')
                    .setStyle(ButtonStyle.Secondary),
            );

        return interaction.reply({
            content: 'Are you sure you want to close the ticket?',
            components: [row]
        });
    } else if (buttonId == 'tickets_yes_close') {
        const tag = await db.findOne({ where: { channelId: interaction.channel.id } });

        const affectedRows = await db.update(
            { 
                closed: true,
                closerId: tag.closerId ? `${interaction.member.user.id},${tag.closerId}` : interaction.member.user.id

            }, 
            { where: { channelId: interaction.channel.id } }
        );

        if (affectedRows > 0) {
            console.log(`TICKETS: closing of ${interaction.channel.name} updated in db. affected rows: ${affectedRows}`);
        } else {
            console.log(`TICKETS: error in updating db for closing of ${interaction.channel.name}`);
        }

        let name = `closed-${interaction.channel.name.split('-')[1]}`;

        interaction.channel.setName(name)
            .catch((e) => console.log(`TICKETS: ERROR: error in changing channel name: ${e}`));
        
        await interaction.message.delete()
            .catch((e) => console.log(`TICKETS: ERROR: error deleting message: ${e}`));
        
        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#EFEFE5')
                    .setDescription(`🔒 Ticket closed by ${interaction.member.user} 🔒`)
            ]
        })
            .catch((e) => console.log(`TICKETS: ERROR: error in sending embed: ${e}`));

        
        await interaction.channel.send({
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`tickets_open`)
                            .setLabel('🔑 Open Ticket')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`tickets_delete`)
                            .setLabel('⛔️ Delete Ticket')
                            .setStyle(ButtonStyle.Danger),
                    )
            ]
        })
            .catch((e) => console.log(`TICKETS: ERROR: error in sending embed: ${e}`));

        return;

    } else if (buttonId == 'tickets_no_close') {
        await interaction.message.delete()
            .catch((e) => console.log(`TICKETS: ERROR: error deleting message: ${e}`));

        return;
    } else if (buttonId == 'tickets_open') {
        let allowedRoleIds = TicketsData.viewAllowedRoleIds[numericId];
        if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
            
            return interaction.reply({
                content: '❌ You do not have the privileges to use this function. ❌',
                ephemeral: true
            })
                .catch((e) => console.log(`ERROR: error in sending reply: ${e}`));;
        }

        const tag = await db.findOne({ where: { channelId: interaction.channel.id } });

        const affectedRows = await db.update(
            { 
                closed: false

            }, 
            { where: { channelId: interaction.channel.id } }
        );

        console.log(`TICKETS: ${affectedRows} rows updated - ${interaction.channel.name} opened by ${interaction.member.user.username}.`)
        let name = `${tag.type}-${interaction.channel.name.split('-')[1]}`;

        interaction.channel.setName(name)
            .catch((e) => console.log(`TICKETS: ERROR: error in changing channel name: ${e}`));

        await interaction.message.delete()
            .catch((e) => console.log(`TICKETS: ERROR: error deleting message: ${e}`));
        
        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#EFEFE5')
                    .setDescription(`🔑 Ticket opened by ${interaction.member.user} 🔑`)
            ]
        })
            .catch((e) => console.log(`TICKETS: ERROR: error in sending embed: ${e}`));

        return;
    } else if (buttonId == 'tickets_delete') {
        let allowedRoleIds = TicketsData.viewAllowedRoleIds[numericId];
        if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
            return interaction.reply({
                content: '❌ You do not have the privileges to use this function. ❌',
                ephemeral: true
            })
                .catch((e) => console.log(`ERROR: error in sending reply: ${e}`));;
        }

        await interaction.message.delete()
            .catch((e) => console.log(`TICKETS: ERROR: error deleting message: ${e}`));

        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#EFEFE5')
                    .setDescription(`🗑 Channel will delete in 5 seconds. 🗑`)
            ]
        })
            .catch((e) => console.log(`TICKETS: ERROR: error in sending embed: ${e}`));

        await delay(5000);
        interaction.channel.delete()
            .catch((e) => console.log(`TICKETS: ERROR: error in deleting channel: ${e}`));

        return;
    }
}

export default {
    buttonInteractions
}