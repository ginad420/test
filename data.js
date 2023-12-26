import { ButtonStyle } from 'discord.js';

const buttonCustomIds = {
    support: 'tickets_start_support',
    collab: 'tickets_start_collab',
    cnsupport: 'tickets_start_cnsupport'
}

const leadingEmoji = {
    support: '❔',
    collab: '🤝',
    cnsupport: '❔'
}

const serverButtons = {
    0: [
        buttonCustomIds.support,
        buttonCustomIds.collab,
        buttonCustomIds.cnsupport
    ],
    2: [
        buttonCustomIds.support,
        buttonCustomIds.collab,
    ]
}

const buttonData = {
    0: {
        'tickets_start_support': {
            label: '❔ General Support',
            buttonStyle: ButtonStyle.Secondary
        },
        'tickets_start_collab': {
            label: '🤝 Collab Request',
            buttonStyle: ButtonStyle.Secondary
        },
        'tickets_start_cnsupport': {
            label: '❔ 開票',
            buttonStyle: ButtonStyle.Secondary
        }
    },
    2: {
        'tickets_start_support': {
            label: '❔ General Support',
            buttonStyle: ButtonStyle.Secondary
        },
        'tickets_start_collab': {
            label: '🤝 Collab Request',
            buttonStyle: ButtonStyle.Secondary
        }
    }

}

const viewAllowedRoleIds = {
    0: [
        '949203125028417536', //admin
        '964805783344795659', //mod
        '1039071270609891379' //advisor
    ],
    2: [
        '952675750882992198' //test-tickets-viewer-role
    ]
}

export default {
    serverButtons,
    leadingEmoji,
    buttonData,
    viewAllowedRoleIds
}