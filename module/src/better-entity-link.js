import {BetterEntityLink} from "./BetterEntityLink.js";

Hooks.on('ready', () => {

    // Scene - "View" button
    BetterEntityLink.registerSceneAction({
        name: "SCENES.View",
        icon: "fa-eye",
        condition: async entity => game.user.isGM,
        callback: async entity => {
            if (!game.user.isGM) return
            await entity.view()
        }
    });

    // Scene - "Activate" button
    BetterEntityLink.registerSceneAction({
        name: "SCENES.Activate",
        icon: "fa-bullseye",
        condition: async entity => game.user.isGM,
        callback: async entity => {
            if (!game.user.isGM) return
            await entity.activate()
        }
    });

    // RollTable - "Roll" button
    BetterEntityLink.registerRolltableAction({
        name: "TABLE.Roll",
        icon: "fa-dice-d20",
        condition: async entity => game.user.isGM,
        callback: async entity => await entity.draw()
    });

    // Macro - "Edit Macro" button
    BetterEntityLink.registerMacroAction({
        name: "MACRO.Edit",
        icon: "fa-edit",
        callback: async entity => entity.sheet.render(true)
    });

    // Actor - "View Character Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.CharArt",
        icon: "fa-image",
        condition: async entity => {
            return entity?.data.img !== CONST.DEFAULT_TOKEN;
        },
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.data.img, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // Actor - "View Token Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.TokenArt",
        icon: "fa-image",
        condition: async entity => {
            if (entity?.data.token?.randomImg) return false;
            return ![undefined, null, CONST.DEFAULT_TOKEN].includes(entity?.data.token.img);
        },
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.data.token.img, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // Item - "View Item Artwork" button
    BetterEntityLink.registerItemAction({
        name: "ITEM.ViewArt",
        icon: "fa-image",
        condition: async entity => entity?.data.img !== CONST.DEFAULT_TOKEN,
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.data.img, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // JournalEntry - "Show players (Text)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeText")})`,
        icon: "fa-eye",
        condition: async entity => entity?.data.img !== CONST.DEFAULT_TOKEN,
        callback: async entity => {
            await game.socket.emit("showEntry", entity.uuid, "text", true, entry => {
                Journal._showEntry(entity.uuid, "text", true);
                ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                    mode: "text",
                    title: entity.name,
                    which: "all"
                }));
            });
        }
    });

    // JournalEntry - "Show players (Image)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeImage")})`,
        icon: "fa-eye",
        condition: async entity => entity?.data.img !== CONST.DEFAULT_TOKEN,
        callback: async entity => {
            await game.socket.emit("showEntry", entity.uuid, "image", true, entry => {
                Journal._showEntry(entity.uuid, "image", true);
                ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                    mode: "image",
                    title: entity.name,
                    which: "all"
                }));
            });
        }
    });

    Hooks.on('renderActorSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderJournalSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderItemSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderChatMessage', BetterEntityLink.enhanceEntityLinks);
})

/*
Hooks.on('renderApplication', enhanceEntityLink);
Hooks.on('renderDocumentSheet', enhanceEntityLink);
Hooks.on('renderRollTableConfig', enhanceEntityLink);
Hooks.on('renderSidebarTab', enhanceEntityLink);
Hooks.on('renderFormApplication', enhanceEntityLink);
*/